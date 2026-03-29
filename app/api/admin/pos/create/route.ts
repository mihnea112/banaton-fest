// app/api/admin/pos/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- helpers ----------
function nowIso() {
  return new Date().toISOString();
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function toInt(v: unknown, fallback = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeDayCodeUpper(
  v: string,
): "FRI" | "SAT" | "SUN" | "MON" | null {
  const x = String(v || "")
    .trim()
    .toUpperCase();
  if (x === "FRI" || x === "SAT" || x === "SUN" || x === "MON") return x;
  return null;
}

function daySetFromInput(input: {
  canonicalDaySet?: unknown;
  dayCodes?: unknown;
}): string {
  // canonical_day_set is NOT NULL in order_items -> always return something
  // For 4-day products your DB historically uses "" (empty string), so we allow that.
  const canonical = asString(input.canonicalDaySet);
  if (canonical !== null) return canonical; // can be ""

  const rawDays = Array.isArray(input.dayCodes) ? input.dayCodes : [];
  const days = rawDays
    .map((d) => normalizeDayCodeUpper(String(d)))
    .filter(Boolean) as Array<"FRI" | "SAT" | "SUN" | "MON">;

  // If no days provided, allow empty (used by 4-day products in your prices table)
  if (!days.length) return "";

  // Stable canonical format
  return Array.from(new Set(days)).join(",");
}

// ---------- Supabase ----------
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl)
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL");
if (!supabaseServiceRoleKey)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- admin auth ----------
async function requireAdminAuth() {
  // must match your middleware cookie
  const c = await cookies();
  const admin = c.get("banaton_admin")?.value;
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }
  return null;
}

// ---------- ticket issuing (uses your schema) ----------
async function getNextTicketNumberStart(): Promise<number> {
  const { data, error } = await supabase
    .from("issued_tickets")
    .select("ticket_number")
    .order("ticket_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  const max = data && data[0] ? toInt((data[0] as any).ticket_number, 0) : 0;
  return max + 1;
}

async function issueTicketsForOrder(params: {
  orderId: string;
  publicToken: string;
  attendeeName?: string | null;
}): Promise<{ issued: boolean; count: number }> {
  const { orderId, publicToken, attendeeName } = params;

  // idempotency guard
  const { data: existing, error: existingErr } = await supabase
    .from("issued_tickets")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);

  if (existingErr) throw existingErr;
  if (existing && existing.length > 0) return { issued: false, count: 0 };

  // load order_items
  const { data: itemsRaw, error: itemsErr } = await supabase
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", orderId);

  if (itemsErr) throw itemsErr;
  const items = (itemsRaw || []) as Array<{ id: string; quantity: number }>;
  if (!items.length) return { issued: false, count: 0 };

  let nextTicketNumber = await getNextTicketNumberStart();

  const rows: Array<{
    id: string;
    order_item_id: string;
    order_id: string;
    ticket_number: number;
    qr_code_text: string;
    attendee_name: string | null;
    status: string;
    created_at: string;
  }> = [];

  for (const it of items) {
    const qty = Math.max(1, toInt(it.quantity ?? 1, 1));

    for (let i = 1; i <= qty; i++) {
      const qr = `banaton:${publicToken}:${it.id}:${i}`;

      rows.push({
        id: crypto.randomUUID(),
        order_item_id: it.id,
        order_id: orderId,
        ticket_number: nextTicketNumber++,
        qr_code_text: qr,
        attendee_name: attendeeName ?? null,
        status: "valid",
        created_at: nowIso(),
      });
    }
  }

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error: insErr } = await supabase
      .from("issued_tickets")
      .insert(slice);
    if (insErr) throw insErr;
  }

  return { issued: true, count: rows.length };
}

// ---------- Types ----------
type PosItemInput = {
  productCode?: string; // preferred
  ticketProductId?: string; // fallback
  qty?: number;
  quantity?: number;

  // days
  dayCodes?: string[]; // ["fri","sat"] etc
  canonicalDaySet?: string; // "FRI,SAT" or "" for 4-day

  // optional overrides (rarely needed)
  unitPriceRon?: number;
  variantLabelSnapshot?: string | null;
};

type PosPayload = {
  customer?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  };
  items?: PosItemInput[];

  // POS VIP allocation (server-side reservation).
  // If you sell VIP at the POS, provide the table label (e.g. "Masa 12").
  // Days are derived from each VIP order_item (canonical_day_set), with VIP_4DAY defaulting to all 4 days.
  vip?: {
    tableLabel?: string; // preferred (matches vip_tables.label)
    tableId?: string; // optional direct id
  };

  // if true, after creating order we call /api/tickets/public?token=... to send email once
  sendEmail?: boolean;
};

type TicketProductRow = {
  id: string;
  code: string;
  category: string; // enum in DB
  duration_type: string; // enum in DB
  name_ro: string;
};

async function resolveTicketProduct(
  input: PosItemInput,
): Promise<TicketProductRow> {
  const code = asString(input.productCode);
  const id = asString(input.ticketProductId);

  if (!code && !id) {
    throw new Error("Missing productCode / ticketProductId");
  }

  let q = supabase
    .from("ticket_products")
    .select("id, code, category, duration_type, name_ro");

  if (id) q = q.eq("id", id);
  else q = q.eq("code", code as string);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      `ticket_products not found for ${id ? `id=${id}` : `code=${code}`}`,
    );

  return data as TicketProductRow;
}

async function resolveUnitPriceRon(params: {
  ticketProductId: string;
  canonicalDaySet: string; // may be ""
  overrideUnitPriceRon?: number | null;
}): Promise<number> {
  if (
    typeof params.overrideUnitPriceRon === "number" &&
    params.overrideUnitPriceRon > 0
  ) {
    return Math.floor(params.overrideUnitPriceRon);
  }

  // price table you already have: ticket_product_prices
  // we assume columns: ticket_product_id, canonical_day_set, price_ron, is_active
  const { data, error } = await supabase
    .from("ticket_product_prices")
    .select("price_ron, is_active")
    .eq("ticket_product_id", params.ticketProductId)
    .eq("canonical_day_set", params.canonicalDaySet)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(
      `No active price for ticket_product_id=${params.ticketProductId} canonical_day_set="${params.canonicalDaySet}"`,
    );
  }

  const price = toInt((data as any).price_ron, 0);
  if (price <= 0) throw new Error("Invalid price_ron in ticket_product_prices");
  return price;
}

// ---------- VIP reservation (POS server-side) ----------
type EventDayRow = { id: string; day_code: string };

type VipTableRow = {
  id: string;
  label: string | null;
  table_number: number | null;
  capacity: number | null;
  status: string | null;
};

function parseTableNumberFromLabel(label: string): number | null {
  const m = String(label).match(/(\d+)/);
  if (!m) return null;
  const n = Math.floor(Number(m[1]));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function splitCanonicalDaySet(canonical: string): Array<"FRI" | "SAT" | "SUN" | "MON"> {
  const raw = String(canonical || "")
    .trim()
    .toUpperCase();
  if (!raw) return [];

  const parts = raw
    .split(/[^A-Z]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const out: Array<"FRI" | "SAT" | "SUN" | "MON"> = [];
  for (const p of parts) {
    const d = normalizeDayCodeUpper(p);
    if (d) out.push(d);
  }
  return Array.from(new Set(out));
}

async function loadEventDayMap(): Promise<Record<"FRI" | "SAT" | "SUN" | "MON", string>> {
  const { data, error } = await supabase
    .from("event_days")
    .select("id, day_code")
    .in("day_code", ["FRI", "SAT", "SUN", "MON"]);
  if (error) throw error;

  const rows = (data || []) as unknown as EventDayRow[];
  const map = { FRI: "", SAT: "", SUN: "", MON: "" } as Record<
    "FRI" | "SAT" | "SUN" | "MON",
    string
  >;

  for (const r of rows) {
    const key = normalizeDayCodeUpper(r.day_code);
    if (key) map[key] = r.id;
  }

  // ensure all exist
  for (const k of ["FRI", "SAT", "SUN", "MON"] as const) {
    if (!map[k]) throw new Error(`Missing event_day for ${k}`);
  }

  return map;
}

async function resolveVipTable(params: { tableId?: string | null; tableLabel?: string | null }): Promise<VipTableRow> {
  const tableId = asString(params.tableId);
  const tableLabel = asString(params.tableLabel);

  if (!tableId && !tableLabel) {
    throw new Error("VIP allocation requires vip.tableLabel or vip.tableId");
  }

  let q = supabase.from("vip_tables").select("id, label, table_number, capacity, status");
  if (tableId) q = q.eq("id", tableId);
  else {
    // try label match first
    q = q.eq("label", tableLabel as string);
  }

  let { data, error } = await q.maybeSingle();
  if (error) throw error;

  // fallback: parse number and match by table_number
  if (!data && tableLabel) {
    const n = parseTableNumberFromLabel(tableLabel);
    if (n) {
      const r = await supabase
        .from("vip_tables")
        .select("id, label, table_number, capacity, status")
        .eq("table_number", n)
        .maybeSingle();
      if (r.error) throw r.error;
      data = r.data as any;
    }
  }

  if (!data) {
    throw new Error(
      `VIP table not found for ${tableId ? `id=${tableId}` : `label=${tableLabel}`}`,
    );
  }

  return data as VipTableRow;
}

async function getAlreadyReservedSeats(params: {
  vipTableId: string;
  vipReservationDayEventDayId: string;
}): Promise<number> {
  // Step 1: get reservation ids for this table
  const { data: resIds, error: resErr } = await supabase
    .from("vip_table_reservations")
    .select("id")
    .eq("vip_table_id", params.vipTableId);

  if (resErr) throw resErr;

  const ids = (resIds || []).map((r: any) => r.id).filter(Boolean);
  if (!ids.length) return 0;

  // Step 2: sum seats in reservation_days for these reservations and this day
  const { data: days, error: dayErr } = await supabase
    .from("vip_table_reservation_days")
    .select("seats_reserved")
    .in("vip_table_reservation_id", ids)
    .eq("event_day_id", params.vipReservationDayEventDayId);

  if (dayErr) throw dayErr;

  return (days || []).reduce((s: number, r: any) => s + toInt(r.seats_reserved, 0), 0);
}

async function createVipReservationsForPosOrder(params: {
  orderId: string;
  orderItems: Array<{ id: string; category: string; quantity: number; canonical_day_set: string; duration_type: string }>;
  vipTableId: string;
  vipTableCapacity: number;
  eventDayIdByCode: Record<"FRI" | "SAT" | "SUN" | "MON", string>;
}): Promise<{ created: number; createdDays: number }> {
  const vipItems = params.orderItems.filter((it) => String(it.category).toLowerCase() === "vip");
  if (!vipItems.length) return { created: 0, createdDays: 0 };

  // Validate capacity per day first (fail fast)
  for (const it of vipItems) {
    const qty = Math.max(1, toInt(it.quantity, 1));

    const daysFromCanonical = splitCanonicalDaySet(it.canonical_day_set);
    const days: Array<"FRI" | "SAT" | "SUN" | "MON"> = daysFromCanonical.length
      ? daysFromCanonical
      : (it.duration_type === "4_day" ? ["FRI", "SAT", "SUN", "MON"] : []);

    // If somehow still empty, default to all (safe)
    const finalDays = days.length ? days : (["FRI", "SAT", "SUN", "MON"] as const);

    for (const d of finalDays) {
      const eventDayId = params.eventDayIdByCode[d];
      const already = await getAlreadyReservedSeats({
        vipTableId: params.vipTableId,
        vipReservationDayEventDayId: eventDayId,
      });

      const next = already + qty;
      if (next > params.vipTableCapacity) {
        throw new Error(
          `VIP table capacity exceeded for ${d}: ${already} reserved, trying to add ${qty}, capacity ${params.vipTableCapacity}`,
        );
      }
    }
  }

  // Insert reservations + reservation days
  let created = 0;
  let createdDays = 0;

  for (const it of vipItems) {
    const qty = Math.max(1, toInt(it.quantity, 1));

    const daysFromCanonical = splitCanonicalDaySet(it.canonical_day_set);
    const days: Array<"FRI" | "SAT" | "SUN" | "MON"> = daysFromCanonical.length
      ? daysFromCanonical
      : (it.duration_type === "4_day" ? ["FRI", "SAT", "SUN", "MON"] : []);

    const finalDays = days.length ? days : (["FRI", "SAT", "SUN", "MON"] as const);

    const reservationId = crypto.randomUUID();

    const { error: insResErr } = await supabase.from("vip_table_reservations").insert({
      id: reservationId,
      order_id: params.orderId,
      order_item_id: it.id,
      vip_table_id: params.vipTableId,
      seats_reserved: qty,
      created_at: nowIso(),
    });

    if (insResErr) throw insResErr;
    created += 1;

    const dayRows = finalDays.map((d) => ({
      id: crypto.randomUUID(),
      vip_table_reservation_id: reservationId,
      event_day_id: params.eventDayIdByCode[d],
      seats_reserved: qty,
    }));

    const { error: insDaysErr } = await supabase
      .from("vip_table_reservation_days")
      .insert(dayRows);

    if (insDaysErr) throw insDaysErr;
    createdDays += dayRows.length;
  }

  return { created, createdDays };
}

// ---------- Route ----------
export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth();
  if (unauthorized) return unauthorized;

  let orderIdForRollback: string | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as PosPayload;

    const itemsIn = Array.isArray(body.items) ? body.items : [];
    if (!itemsIn.length) {
      return NextResponse.json(
        { ok: false, error: { message: "No items provided" } },
        { status: 400 },
      );
    }

    const email = asString(body.customer?.email);
    const phone = asString(body.customer?.phone);
    const firstName = asString(body.customer?.firstName);
    const lastName = asString(body.customer?.lastName);
    const fullName =
      asString(body.customer?.fullName) ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      null;

    // For POS printing, email can be optional.
    // If you want it mandatory ALWAYS, uncomment the block below.
    /*
    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: { message: "Customer email is required" } },
        { status: 400 },
      );
    }
    */
    if (email && !isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid email" } },
        { status: 400 },
      );
    }

    // Pre-resolve VIP requirements BEFORE writing anything to DB.
    // If POS sells VIP items, the cashier MUST pick a table.
    const vipTableIdInput = asString(body.vip?.tableId);
    const vipTableLabelInput = asString(body.vip?.tableLabel);

    // We'll compute hasVipItems after we build lines, but we also want a fast check from inputs.
    // (If ticket_products resolution says VIP later, we still enforce table.)
    const vipContext: {
      table: VipTableRow | null;
      eventDayIdByCode: Record<"FRI" | "SAT" | "SUN" | "MON", string> | null;
    } = { table: null, eventDayIdByCode: null };

    // 1) Normalize + compute lines
    const lines: Array<{
      id: string;
      order_id: string;
      ticket_product_id: string;
      category: string;
      duration_type: string;
      product_name_snapshot: string;
      variant_label_snapshot: string | null;
      unit_price_ron: number;
      quantity: number;
      line_total_ron: number;
      canonical_day_set: string; // NOT NULL
      created_at: string;
    }> = [];

    const orderId = crypto.randomUUID();
    orderIdForRollback = orderId;
    const publicToken = crypto.randomUUID();
    const createdAt = nowIso();

    // Best-effort rollback tracking (avoids orphan paid orders on partial failure)
    let wroteOrder = false;
    let wroteItems = false;
    let wroteVipReservations = false;
    let wroteTickets = false;

    for (const input of itemsIn) {
      const qty = Math.max(1, toInt(input.qty ?? input.quantity ?? 1, 1));
      const canonicalDaySet = daySetFromInput({
        canonicalDaySet: input.canonicalDaySet,
        dayCodes: input.dayCodes,
      });

      const tp = await resolveTicketProduct(input);
      const unitPrice = await resolveUnitPriceRon({
        ticketProductId: tp.id,
        canonicalDaySet,
        overrideUnitPriceRon:
          typeof input.unitPriceRon === "number" ? input.unitPriceRon : null,
      });

      const lineTotal = unitPrice * qty;

      lines.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        ticket_product_id: tp.id,
        category: tp.category,
        duration_type: tp.duration_type,
        product_name_snapshot: tp.name_ro, // your DB wants name_ro updated to Fan Pit etc
        variant_label_snapshot: input.variantLabelSnapshot ?? null,
        unit_price_ron: unitPrice,
        quantity: qty,
        line_total_ron: lineTotal,
        canonical_day_set: canonicalDaySet, // may be ""
        created_at: createdAt,
      });
    }

    // --- Enforce VIP table selection and pre-load event day map before writing ---
    const hasVipItems = lines.some(
      (l) => String(l.category).toLowerCase() === "vip",
    );

    if (hasVipItems) {
      // POS must provide a VIP table for VIP items.
      // If missing, fail with 400 (do NOT create any DB rows).
      if (!vipTableIdInput && !vipTableLabelInput) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              message:
                "VIP allocation requires selecting a table. Provide vip.tableLabel (ex: 'Masa 12') or vip.tableId.",
            },
          },
          { status: 400 },
        );
      }

      try {
        vipContext.table = await resolveVipTable({
          tableId: vipTableIdInput,
          tableLabel: vipTableLabelInput,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid VIP table";
        return NextResponse.json(
          { ok: false, error: { message: msg } },
          { status: 400 },
        );
      }

      const capacity = Math.max(0, toInt(vipContext.table.capacity ?? 0, 0));
      if (capacity <= 0) {
        return NextResponse.json(
          { ok: false, error: { message: "VIP table capacity is invalid" } },
          { status: 400 },
        );
      }

      if (String(vipContext.table.status || "").toLowerCase() === "inactive") {
        return NextResponse.json(
          { ok: false, error: { message: "VIP table is inactive" } },
          { status: 400 },
        );
      }

      vipContext.eventDayIdByCode = await loadEventDayMap();
    }

    const subtotalRon = lines.reduce(
      (s, l) => s + toInt(l.line_total_ron, 0),
      0,
    );
    const totalRon = subtotalRon;

    // 2) Insert order (paid cash)
    const { error: insOrderErr } = await supabase.from("orders").insert({
      id: orderId,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_full_name: fullName,
      customer_email: email,
      customer_phone: phone,

      billing_city: null,
      billing_county: null,
      billing_address: null,
      billing_name: null,
      billing_country: "RO",

      status: "paid",
      payment_status: "paid",
      payment_provider: "cash",
      payment_provider_intent_id: null,
      payment_reference: null,

      currency: "RON",
      subtotal_ron: subtotalRon,
      total_ron: totalRon,

      notes: "POS sale (cash)",
      created_at: createdAt,
      updated_at: createdAt,
      public_token: publicToken,

      expires_at: null,
      failure_reason: null,
      tickets_email_sent_at: null,
    });

    if (insOrderErr) throw insOrderErr;
    wroteOrder = true;

    // 3) Insert order_items
    const { error: insItemsErr } = await supabase
      .from("order_items")
      .insert(lines);
    if (insItemsErr) throw insItemsErr;
    wroteItems = true;

    // 3.5) POS VIP allocation -> create vip_table_reservations (+ vip_table_reservation_days)
    // This is a separate implementation from /order/[publicToken]/vip-allocation, so POS can work standalone.
    let vipReservationResult: { created: number; createdDays: number } = {
      created: 0,
      createdDays: 0,
    };

    if (hasVipItems) {
      // table + event day map were pre-resolved above
      const vipTable = vipContext.table as VipTableRow;
      const capacity = Math.max(0, toInt(vipTable.capacity ?? 0, 0));
      const eventDayIdByCode = vipContext.eventDayIdByCode as Record<
        "FRI" | "SAT" | "SUN" | "MON",
        string
      >;

      vipReservationResult = await createVipReservationsForPosOrder({
        orderId,
        orderItems: lines.map((l) => ({
          id: l.id,
          category: l.category,
          quantity: l.quantity,
          canonical_day_set: l.canonical_day_set,
          duration_type: l.duration_type,
        })),
        vipTableId: vipTable.id,
        vipTableCapacity: capacity,
        eventDayIdByCode,
      });

      wroteVipReservations = vipReservationResult.created > 0;
    }

    // 4) Issue tickets now (so PDF works instantly)
    const issued = await issueTicketsForOrder({
      orderId,
      publicToken: String(publicToken),
      attendeeName: fullName,
    });
    wroteTickets = issued.issued || issued.count > 0;

    // 5) Optional: send tickets email via your existing route (idempotent via tickets_email_sent_at)
    let emailed = false;
    if (body.sendEmail && email) {
      const origin = new URL(req.url).origin;
      try {
        const res = await fetch(
          `${origin}/api/tickets/public?token=${encodeURIComponent(String(publicToken))}`,
          { method: "GET", cache: "no-store" },
        );
        const j = await res.json().catch(() => ({}));
        emailed = !!j?.tickets_email_sent || res.ok;
      } catch {
        // don't fail POS if email fails
        emailed = false;
      }
    }

    const origin = new URL(req.url).origin;

    return NextResponse.json({
      ok: true,
      order: {
        id: orderId,
        public_token: publicToken,
        status: "paid",
        payment_status: "paid",
        currency: "RON",
        subtotal_ron: subtotalRon,
        total_ron: totalRon,
        customer_email: email ?? null,
        customer_phone: phone ?? null,
      },
      issued_tickets: issued,
      vip_reservations: vipReservationResult,
      links: {
        successUrl: `${origin}/success?order=${encodeURIComponent(String(publicToken))}`,
        pdfUrl: `${origin}/api/tickets/pdf?token=${encodeURIComponent(String(publicToken))}`,
      },
      emailed,
    });
  } catch (e) {
    console.error("[POST /api/admin/pos/create] error", e);
    // Best-effort rollback to avoid orphan paid orders on partial failure.
    // Ignore rollback errors.
    try {
      if (orderIdForRollback) {
        await supabase.from("issued_tickets").delete().eq("order_id", String(orderIdForRollback));

        const { data: vr } = await supabase
          .from("vip_table_reservations")
          .select("id")
          .eq("order_id", String(orderIdForRollback));

        const vrIds = (vr || []).map((r: any) => r.id).filter(Boolean);
        if (vrIds.length) {
          await supabase
            .from("vip_table_reservation_days")
            .delete()
            .in("vip_table_reservation_id", vrIds);
        }

        await supabase.from("vip_table_reservations").delete().eq("order_id", String(orderIdForRollback));
        await supabase.from("order_items").delete().eq("order_id", String(orderIdForRollback));
        await supabase.from("orders").delete().eq("id", String(orderIdForRollback));
      }
    } catch {
      // ignore
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message: msg } },
      { status: 500 },
    );
  }
}

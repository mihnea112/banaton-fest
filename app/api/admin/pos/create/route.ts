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

// ---------- Route ----------
export async function POST(req: Request) {
  const unauthorized = await requireAdminAuth();
  if (unauthorized) return unauthorized;

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
    const publicToken = crypto.randomUUID();
    const createdAt = nowIso();

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

    // 3) Insert order_items
    const { error: insItemsErr } = await supabase
      .from("order_items")
      .insert(lines);
    if (insItemsErr) throw insItemsErr;

    // 4) Issue tickets now (so PDF works instantly)
    const issued = await issueTicketsForOrder({
      orderId,
      publicToken: String(publicToken),
      attendeeName: fullName,
    });

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
      links: {
        successUrl: `${origin}/success?order=${encodeURIComponent(String(publicToken))}`,
        pdfUrl: `${origin}/api/tickets/pdf?token=${encodeURIComponent(String(publicToken))}`,
      },
      emailed,
    });
  } catch (e) {
    console.error("[POST /api/admin/pos/create] error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message: msg } },
      { status: 500 },
    );
  }
}

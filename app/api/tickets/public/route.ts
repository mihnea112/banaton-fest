// app/api/tickets/public/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function toInt(value: unknown, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

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

type OrderItemRow = {
  id: string;
  category: string | null;
  quantity: number | null;
  product_name_snapshot: string | null;
  variant_label_snapshot: string | null;
  duration_type: string | null;
  canonical_day_set: string | null;
  unit_price_ron?: number | null;
  line_total_ron?: number | null;
};

async function issueTicketsIfMissing(params: {
  orderId: string;
  publicToken: string;
  attendeeName?: string | null;
}): Promise<{ issued: boolean; count: number }> {
  const { orderId, publicToken, attendeeName } = params;

  // 1) idempotency guard: if any ticket exists, do nothing
  const { data: existing, error: existingErr } = await supabase
    .from("issued_tickets")
    .select("id")
    .eq("order_id", orderId)
    .limit(1);

  if (existingErr) throw existingErr;
  if (existing && existing.length > 0) return { issued: false, count: 0 };

  // 2) load order items
  const { data: itemsRaw, error: itemsErr } = await supabase
    .from("order_items")
    .select(
      "id, category, quantity, product_name_snapshot, variant_label_snapshot, duration_type, canonical_day_set, unit_price_ron, line_total_ron",
    )
    .eq("order_id", orderId);

  if (itemsErr) throw itemsErr;
  const items = (itemsRaw || []) as unknown as OrderItemRow[];
  if (!items.length) return { issued: false, count: 0 };

  // 3) determine ticket number start (best-effort)
  let nextTicketNumber = await getNextTicketNumberStart();

  // 4) build inserts
  const rows: Array<{
    order_id: string;
    order_item_id: string;
    ticket_number: number;
    qr_code_text: string;
    attendee_name: string | null;
    status: string;
    created_at: string;
  }> = [];

  for (const it of items) {
    const qty = Math.max(1, toInt(it.quantity ?? 1, 1));

    for (let i = 1; i <= qty; i++) {
      // deterministic & scan-friendly
      const qr = `banaton:${publicToken}:${it.id}:${i}`;

      rows.push({
        order_id: orderId,
        order_item_id: it.id,
        ticket_number: nextTicketNumber++,
        qr_code_text: qr,
        attendee_name: attendeeName ?? null,
        status: "valid",
        created_at: nowIso(),
      });
    }
  }

  // 5) insert in batches
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error: insErr } = await supabase.from("issued_tickets").insert(slice);
    if (insErr) throw insErr;
  }

  return { issued: true, count: rows.length };
}
const GMAIL_USER = process.env.GMAIL_USER || process.env.GMAIL_EMAIL || null;
const GMAIL_APP_PASSWORD =
  process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || null;

function canSendMail() {
  return !!(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function buildTicketsEmailHtml(params: {
  attendeeName: string | null;
  publicToken: string;
  tickets: Array<{ ticket_number?: number | null; qr_code_text?: string | null }>;
  items: Array<{
    product_name_snapshot?: string | null;
    variant_label_snapshot?: string | null;
    category?: string | null;
    qty?: number | null;
    canonical_day_set?: string | null;
  }>;
  viewUrl: string;
  pdfUrl: string;
}) {
  const {
    attendeeName,
    publicToken,
    tickets,
    items,
    viewUrl,
    pdfUrl,
  } = params;

  const nameLine = attendeeName ? `Salut, <b>${escapeHtml(attendeeName)}</b>!` : "Salut!";

  const itemsHtml = (items || [])
    .map((it) => {
      const title =
        it.product_name_snapshot ||
        (it.category === "vip" ? "Bilet VIP" : "Bilet Fan Pit");
      const variant = it.variant_label_snapshot ? ` · ${it.variant_label_snapshot}` : "";
      const days = it.canonical_day_set ? ` · Zile: ${it.canonical_day_set.replaceAll(',', ', ')}` : "";
      const qty = typeof it.qty === "number" && it.qty > 0 ? ` (x${it.qty})` : "";
      return `<li style="margin:6px 0;">${escapeHtml(title)}${escapeHtml(variant)}${escapeHtml(days)}${escapeHtml(qty)}</li>`;
    })
    .join("");

  const ticketsHtml = (tickets || [])
    .map((t) => {
      const no = t.ticket_number ?? "";
      const qr = t.qr_code_text ?? "";
      return `<li style="margin:6px 0;">Bilet <b>#${escapeHtml(String(no))}</b> — <span style="color:#6b7280; font-size:12px;">${escapeHtml(qr)}</span></li>`;
    })
    .join("");

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background:#0b1020; padding:24px; color:#e5e7eb;">
    <div style="max-width:640px; margin:0 auto; border:1px solid rgba(124,77,255,0.35); background:rgba(45,27,78,0.55); border-radius:16px; overflow:hidden;">
      <div style="padding:18px 20px; background:rgba(36,18,62,0.85); border-bottom:1px solid rgba(124,77,255,0.35);">
        <div style="font-weight:800; font-size:18px;">Banaton Fest 2026 — Confirmare plată</div>
        <div style="margin-top:6px; color:#b39ddb; font-size:13px;">Cod comandă: <b>${escapeHtml(publicToken)}</b></div>
      </div>

      <div style="padding:20px;">
        <p style="margin:0 0 10px 0; font-size:14px;">${nameLine}</p>
        <p style="margin:0 0 14px 0; color:#cbd5e1; font-size:14px;">Plata ta a fost confirmată. Mai jos ai biletele tale și linkurile utile.</p>

        <div style="margin:14px 0; padding:14px; border-radius:14px; background:rgba(26,11,46,0.55); border:1px solid rgba(0,229,255,0.18);">
          <div style="font-weight:700; margin-bottom:8px;">Produse</div>
          <ul style="padding-left:18px; margin:0;">${itemsHtml || "<li>—</li>"}</ul>
        </div>

        <div style="margin:14px 0; padding:14px; border-radius:14px; background:rgba(26,11,46,0.55); border:1px solid rgba(255,215,0,0.18);">
          <div style="font-weight:700; margin-bottom:8px;">Bilete</div>
          <ul style="padding-left:18px; margin:0;">${ticketsHtml || "<li>—</li>"}</ul>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
          <a href="${escapeAttr(viewUrl)}" style="display:inline-block; padding:10px 14px; border-radius:12px; background:#00E5FF; color:#120a1a; font-weight:800; text-decoration:none;">Vezi biletele</a>
          <a href="${escapeAttr(pdfUrl)}" style="display:inline-block; padding:10px 14px; border-radius:12px; background:#FFD700; color:#1b1030; font-weight:800; text-decoration:none;">Descarcă PDF</a>
        </div>

        <p style="margin:16px 0 0 0; color:#b39ddb; font-size:12px;">Prezintă codul QR la intrare. Pentru suport: office.banaton@gmail.com</p>
      </div>
    </div>
  </div>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(s: string) {
  // basic safe attr
  return escapeHtml(s);
}

async function sendTicketsEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!canSendMail()) {
    console.warn("[tickets email] Gmail env missing; skipping send");
    return { ok: false, skipped: true } as const;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER as string,
      pass: GMAIL_APP_PASSWORD as string,
    },
  });

  await transporter.sendMail({
    from: `Banaton Fest <${GMAIL_USER}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return { ok: true } as const;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl)
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL");
if (!supabaseServiceRoleKey)
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

// server-side only (service role). Do NOT expose this key client-side.
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = asString(url.searchParams.get("token"));

    if (!token) return jsonError("Missing token");

    // 1) resolve order by public_token
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, public_token, status, payment_status, currency, total_ron, customer_first_name, customer_last_name, customer_email, notes, tickets_email_sent_at",
      )
      .eq("public_token", token)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) return jsonError("Order not found", 404);

    // 1.5) issue tickets if missing (only for paid orders)
    const status = String(order.status ?? "").toLowerCase();
    const payStatus = String(order.payment_status ?? "").toLowerCase();
    const isPaid = status === "paid" || payStatus === "paid";

    let issuedNow = { issued: false, count: 0 } as { issued: boolean; count: number };

    if (isPaid) {
      const attendeeName = [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

      issuedNow = await issueTicketsIfMissing({
        orderId: order.id,
        publicToken: order.public_token,
        attendeeName: attendeeName || null,
      });
    }

    // 2) load issued tickets
    const { data: tickets, error: tErr } = await supabase
      .from("issued_tickets")
      .select(
        "id, order_id, order_item_id, ticket_number, qr_code_text, status, created_at",
      )
      .eq("order_id", order.id)
      .order("ticket_number", { ascending: true });

    if (tErr) throw tErr;

    // 3) optional: load order items for labels (nice UI)
    const { data: itemsRaw, error: iErr } = await supabase
      .from("order_items")
      .select(
        "id, category, quantity, unit_price_ron, line_total_ron, product_name_snapshot, variant_label_snapshot, duration_type, canonical_day_set",
      )
      .eq("order_id", order.id);

    // 2.5) Send confirmation email (ONLY order form email, not Stripe) — best-effort & idempotent
    // IMPORTANT: This endpoint may be polled. Use an atomic DB guard to ensure we send only once.
    const orderEmail = asString((order as any).customer_email);

    if (isPaid && orderEmail) {
      // If tickets already exist (e.g., issued on a previous request) we still want to send the email once.
      const ticketsExist = Array.isArray(tickets) && tickets.length > 0;
      const alreadySentAt = (order as any).tickets_email_sent_at as string | null | undefined;

      if (!ticketsExist) {
        // Nothing to send yet (tickets not issued). This endpoint may be polled.
        // We'll try again on the next call after tickets are issued.
        return NextResponse.json({
          ok: true,
          order: {
            id: order.id,
            public_token: order.public_token,
            status: order.status ?? null,
            payment_status: order.payment_status ?? null,
            currency: order.currency ?? "RON",
            total_ron: order.total_ron ?? 0,
            customer_first_name: order.customer_first_name ?? null,
            customer_last_name: order.customer_last_name ?? null,
            customer_email: order.customer_email ?? null,
          },
          tickets: tickets ?? [],
          items: (itemsRaw || []).map((it: any) => ({
            id: it.id,
            category: it.category ?? null,
            qty: it.quantity ?? null,
            unit_price_ron: it.unit_price_ron ?? 0,
            line_total_ron: it.line_total_ron ?? 0,
            product_name_snapshot: it.product_name_snapshot ?? null,
            variant_label_snapshot: it.variant_label_snapshot ?? null,
            duration_type: it.duration_type ?? null,
            canonical_day_set: it.canonical_day_set ?? null,
          })),
          tickets_ready: false,
          tickets_email_sent: !!alreadySentAt,
          tickets_email_sent_at: alreadySentAt ?? null,
        });
      }

      // If the email was already sent, don't attempt to send again.
      if (alreadySentAt) {
        console.log("[tickets email] already sent_at present, skip", {
          orderId: order.id,
          sentAt: alreadySentAt,
        });
      } else {
        // Atomic claim: only the first request can set tickets_email_sent_at from NULL -> now
        const claimedAt = nowIso();
        const { data: claimRow, error: claimErr } = await supabase
          .from("orders")
          .update({ tickets_email_sent_at: claimedAt, updated_at: nowIso() })
          .eq("id", order.id)
          .is("tickets_email_sent_at", null)
          .select("id")
          .maybeSingle();

        if (claimErr) {
          // If claim fails, do not send (prevents duplicate spam in case of unexpected DB behavior)
          console.error("[tickets email] claim failed", claimErr);
        } else if (!claimRow) {
          // Already sent by a previous request
          console.log("[tickets email] already sent, skip", { orderId: order.id });
        } else {
          const origin = new URL(req.url).origin;
          const viewUrl = `${origin}/success?order=${encodeURIComponent(order.public_token)}`;
          const pdfUrl = `${origin}/api/tickets/pdf?token=${encodeURIComponent(order.public_token)}`;

          // build lightweight items list for email
          const itemsForEmail = (itemsRaw || []).map((it: any) => ({
            product_name_snapshot: it.product_name_snapshot ?? null,
            variant_label_snapshot: it.variant_label_snapshot ?? null,
            category: it.category ?? null,
            qty: it.quantity ?? null,
            canonical_day_set: it.canonical_day_set ?? null,
          }));

          const html = buildTicketsEmailHtml({
            attendeeName:
              [order.customer_first_name, order.customer_last_name]
                .filter(Boolean)
                .join(" ")
                .trim() || null,
            publicToken: order.public_token,
            tickets: (tickets || []).map((t: any) => ({
              ticket_number: t.ticket_number ?? null,
              qr_code_text: t.qr_code_text ?? null,
            })),
            items: itemsForEmail,
            viewUrl,
            pdfUrl,
          });

          try {
            await sendTicketsEmail({
              to: orderEmail,
              subject: "Banaton Fest 2026 — biletele tale (plată confirmată)",
              html,
            });

            console.log("[tickets email] sent", {
              orderId: order.id,
              to: orderEmail,
              issuedCount: issuedNow.count,
            });
          } catch (mailErr) {
            // If the email fails AFTER claiming, we keep tickets_email_sent_at set to prevent spam.
            // You can add a manual resend admin flow later if you need.
            console.error("[tickets email] send failed", mailErr);
          }
        }
      }
    }

    const items = (itemsRaw || []).map((it: any) => ({
      id: it.id,
      category: it.category ?? null,
      qty: it.quantity ?? null,
      unit_price_ron: it.unit_price_ron ?? 0,
      line_total_ron: it.line_total_ron ?? 0,
      product_name_snapshot: it.product_name_snapshot ?? null,
      variant_label_snapshot: it.variant_label_snapshot ?? null,
      duration_type: it.duration_type ?? null,
      canonical_day_set: it.canonical_day_set ?? null,
    }));

    if (iErr) {
      // don't fail UI if this table differs; just omit labels
      return NextResponse.json({
        ok: true,
        order: {
          id: order.id,
          public_token: order.public_token,
          status: order.status ?? null,
          payment_status: order.payment_status ?? null,
          currency: order.currency ?? "RON",
          total_ron: order.total_ron ?? 0,
          customer_first_name: order.customer_first_name ?? null,
          customer_last_name: order.customer_last_name ?? null,
          customer_email: order.customer_email ?? null,
        },
        tickets: tickets ?? [],
        items: [],
        tickets_ready: isPaid && (tickets ?? []).length > 0,
        tickets_email_sent: !!(order as any).tickets_email_sent_at,
        tickets_email_sent_at: ((order as any).tickets_email_sent_at ?? null),
      });
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        public_token: order.public_token,
        status: order.status ?? null,
        payment_status: order.payment_status ?? null,
        currency: order.currency ?? "RON",
        total_ron: order.total_ron ?? 0,
        customer_first_name: order.customer_first_name ?? null,
        customer_last_name: order.customer_last_name ?? null,
        customer_email: order.customer_email ?? null,
      },
      tickets: tickets ?? [],
      items: items,
      tickets_ready: isPaid && (tickets ?? []).length > 0,
      tickets_email_sent: !!(order as any).tickets_email_sent_at,
      tickets_email_sent_at: ((order as any).tickets_email_sent_at ?? null),
    });
  } catch (e) {
    console.error("[GET /api/tickets/public] error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message: msg } },
      { status: 500 },
    );
  }
}

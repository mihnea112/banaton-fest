// app/api/tickets/public/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
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
        "id, public_token, status, payment_status, currency, total_ron, customer_first_name, customer_last_name, customer_email",
      )
      .eq("public_token", token)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) return jsonError("Order not found", 404);

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
    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select(
        "id, category, name, label, product_name_snapshot, qty, unit_price_ron, total_ron, canonical_day_set, variant_label, duration_label",
      )
      .eq("order_id", order.id);

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
      items: items ?? [],
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

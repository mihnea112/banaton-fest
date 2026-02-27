import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type LatestOrderRow = {
  id: string;
  public_token: string | null;
  status: string | null;
  payment_status: string | null;
  currency: string | null;
  total_ron: number | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  payment_reference: string | null;
  payment_provider_intent_id: string | null;
  created_at: string;
  updated_at: string;
};

function asNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    // 1) Paid orders count
    const { count: paidOrders, error: e1 } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid");

    if (e1) throw e1;

    // 2) Issued tickets count
    const { count: ticketsIssued, error: e2 } = await supabase
      .from("issued_tickets")
      .select("id", { count: "exact", head: true });

    if (e2) throw e2;

    // 3) Checked-in tickets count
    const { count: checkedIn, error: e3 } = await supabase
      .from("issued_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "checked_in");

    if (e3) throw e3;

    // 4) Total revenue (RON) for paid orders
    // NOTE: For very large datasets, prefer a DB view/RPC aggregate.
    const { data: paidTotals, error: e4 } = await supabase
      .from("orders")
      .select("total_ron")
      .eq("payment_status", "paid");

    if (e4) throw e4;

    const totalRevenueRon = (paidTotals || []).reduce(
      (sum, row) => sum + asNumber((row as { total_ron: unknown }).total_ron),
      0,
    );

    // 5) Latest orders (mix of paid/unpaid) – last 20
    const { data: latestOrdersRaw, error: e5 } = await supabase
      .from("orders")
      .select(
        "id, public_token, status, payment_status, currency, total_ron, customer_first_name, customer_last_name, customer_email, payment_reference, payment_provider_intent_id, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (e5) throw e5;

    const latestOrders = (latestOrdersRaw || []) as LatestOrderRow[];

    // 6) Latest check-ins (last 20) – joins are avoided; we keep it lightweight.
    const { data: latestCheckinsRaw, error: e6 } = await supabase
      .from("issued_tickets")
      .select("id, ticket_number, qr_code_text, status, created_at")
      .eq("status", "checked_in")
      .order("created_at", { ascending: false })
      .limit(20);

    if (e6) throw e6;

    return NextResponse.json({
      ok: true,
      data: {
        paidOrders: paidOrders ?? 0,
        ticketsIssued: ticketsIssued ?? 0,
        checkedIn: checkedIn ?? 0,
        totalRevenueRon,
        latestOrders,
        latestCheckins: latestCheckinsRaw ?? [],
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message: msg } },
      { status: 500 },
    );
  }
}

// app/api/admin/orders/resend-tickets-email/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

async function requireAdmin() {
  const c = await cookies();
  const admin = c.get("banaton_admin")?.value; // <-- change to your cookie name
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }
  return null;
}

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      orderId?: string;
      email?: string;
    };

    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: { message: "Missing orderId" } },
        { status: 400 },
      );
    }
    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: { message: "Invalid email" } },
        { status: 400 },
      );
    }

    // 1) overwrite email in DB + reset flag so normal mail logic can run again
    const { data: order, error: updErr } = await supabase
      .from("orders")
      .update({
        customer_email: email,
        tickets_email_sent_at: null, // allow re-send
      })
      .eq("id", orderId)
      .select("id, public_token, customer_email")
      .maybeSingle();

    if (updErr) throw updErr;
    if (!order) {
      return NextResponse.json(
        { ok: false, error: { message: "Order not found" } },
        { status: 404 },
      );
    }

    // 2) Trigger your existing “send tickets email” logic.
    // IMPORTANT: adapt this fetch path to your real mail route.
    // Example assumes you have a route like: POST /api/tickets/email?token=...
    const token = order.public_token;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: { message: "Order has no public_token" } },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
    const sendUrl = baseUrl
      ? `${baseUrl}/api/tickets/email?token=${encodeURIComponent(token)}&force=1`
      : `/api/tickets/email?token=${encodeURIComponent(token)}&force=1`;

    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const sendJson = (await sendRes.json().catch(() => ({}))) as any;

    if (!sendRes.ok || sendJson?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message:
              sendJson?.error?.message ||
              sendJson?.message ||
              `Email send failed (${sendRes.status})`,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: e instanceof Error ? e.message : "Unknown error" },
      },
      { status: 500 },
    );
  }
}

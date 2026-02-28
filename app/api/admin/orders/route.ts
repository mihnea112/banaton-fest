// app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

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

// Reuse whatever auth you already have in middleware/cookies.
// Minimal: require the same cookie you use for /admin route protection.
async function requireAdmin() {
  const c = await cookies();
  const admin = c.get("banaton_admin")?.value; // <-- change to your cookie name if different
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }
  return null;
}

export async function GET(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(req.url);

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") || "25")),
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // count + rows in one call (PostgREST supports count: "exact")
    const { data, error, count } = await supabase
      .from("orders")
      .select(
        "id, public_token, status, payment_status, total_ron, currency, customer_email, customer_full_name, created_at, tickets_email_sent_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const total = typeof count === "number" ? count : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      ok: true,
      data: {
        rows: data || [],
        page,
        pageSize,
        total,
        totalPages,
      },
    });
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

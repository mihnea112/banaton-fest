// app/api/admin/delete-unpaid/route.ts
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || assertEnv("SUPABASE_URL"),
  assertEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function chunk<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * ✅ AUTH (minimal)
 * Allows access if:
 *  1) x-admin-token header matches ADMIN_TOKEN OR
 *  2) any of the known admin cookies is truthy
 *
 * IMPORTANT: update cookie names to match your auth system if needed.
 */
async function isAdminRequest(): Promise<boolean> {
  const h = await headers();
  const token = h.get("x-admin-token");
  const adminToken = process.env.ADMIN_TOKEN;

  if (adminToken && token && token === adminToken) return true;

  const c = await cookies();

  const possibleCookies = [
    c.get("admin")?.value,
    c.get("is_admin")?.value,
    c.get("banaton_admin")?.value,
    c.get("banaton_admin_session")?.value,
    c.get("bf_admin")?.value,
    c.get("bf_admin_session")?.value,
    c.get("banatonfest_admin")?.value,
  ].filter(Boolean) as string[];

  return possibleCookies.some((v) => v === "1" || v === "true" || v === "yes");
}

type JsonOk = { ok: true; deleted: number; orderIds: string[] };
type JsonErr = { ok: false; error: { message: string } };

export async function POST(): Promise<NextResponse<JsonOk | JsonErr>> {
  try {
    const isAdmin = await isAdminRequest();
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: { message: "Unauthorized" } },
        { status: 401 },
      );
    }

    /**
     * "unpaid" = payment_status != 'paid' OR null
     * (we also exclude status='paid' just in case)
     */
    const { data: unpaidOrders, error: listErr } = await supabase
      .from("orders")
      .select("id, payment_status, status")
      .or("payment_status.is.null,payment_status.neq.paid")
      .neq("status", "paid")
      .limit(5000);

    if (listErr) throw listErr;

    const orderIds = (unpaidOrders || []).map((o: any) => o.id).filter(Boolean);

    if (orderIds.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0, orderIds: [] });
    }

    // Delete children first unless you have ON DELETE CASCADE
    for (const ids of chunk(orderIds, 200)) {
      // Order items (we need their IDs to delete order_item_days safely)
      const { data: orderItems, error: orderItemsErr } = await supabase
        .from("order_items")
        .select("id, order_id")
        .in("order_id", ids);

      if (orderItemsErr && orderItemsErr.code !== "42P01") throw orderItemsErr;

      const orderItemIds = (orderItems || [])
        .map((r: any) => r.id)
        .filter(Boolean) as string[];

      // Order item days (schema uses order_item_id, not order_id)
      if (orderItemIds.length) {
        for (const itemIds of chunk(orderItemIds, 200)) {
          const { error } = await supabase
            .from("order_item_days")
            .delete()
            .in("order_item_id", itemIds);
          // ignore missing-table errors; otherwise crash
          if (error && error.code !== "42P01") throw error;
        }
      }

      // Now delete order_items
      {
        const { error } = await supabase
          .from("order_items")
          .delete()
          .in("order_id", ids);
        if (error && error.code !== "42P01") throw error;
      }

      // VIP reservation days -> VIP reservations (if present)
      try {
        const { data: vipRes, error: vipResListErr } = await supabase
          .from("vip_table_reservations")
          .select("id")
          .in("order_id", ids);

        if (vipResListErr && vipResListErr.code !== "42P01") throw vipResListErr;

        const vipResIds = (vipRes || []).map((r: any) => r.id).filter(Boolean);

        if (vipResIds.length) {
          const { error: delDaysErr } = await supabase
            .from("vip_table_reservation_days")
            .delete()
            .in("vip_table_reservation_id", vipResIds);

          if (delDaysErr && delDaysErr.code !== "42P01") throw delDaysErr;
        }

        const { error: delVipResErr } = await supabase
          .from("vip_table_reservations")
          .delete()
          .in("order_id", ids);

        if (delVipResErr && delVipResErr.code !== "42P01") throw delVipResErr;
      } catch (e: any) {
        // If those tables don't exist, ignore. Otherwise bubble.
        if (!(e?.code === "42P01")) throw e;
      }

      // Issued tickets (safe even if none for unpaid)
      {
        const { error } = await supabase.from("issued_tickets").delete().in("order_id", ids);
        if (error && error.code !== "42P01") throw error;
      }

      // Orders
      {
        const { error } = await supabase.from("orders").delete().in("id", ids);
        if (error) throw error;
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: orderIds.length,
      orderIds,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Delete unpaid orders failed";
    console.error("[POST /api/admin/delete-unpaid] error:", err);
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 },
    );
  }
}
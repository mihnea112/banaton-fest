// app/api/parter/availability/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayCodeLower = "fri" | "sat" | "sun" | "mon";
type DayCodeUpper = "FRI" | "SAT" | "SUN" | "MON";

const DAY_UPPER: Record<DayCodeLower, DayCodeUpper> = {
  fri: "FRI",
  sat: "SAT",
  sun: "SUN",
  mon: "MON",
};

// ✅ PARTER hard cap: 5000 seats per day
const PARTER_CAP_PER_DAY = 5000;

type ParterPackageKey = "PARTER_1DAY_FRI" | "PARTER_1DAY_SAT" | "PARTER_1DAY_SUN" | "PARTER_1DAY_MON" | "PARTER_4DAY";

type PackageAvailability = {
  key: ParterPackageKey;
  label_ro: string;
  days: DayCodeUpper[];
  remaining: number;
};

const PARTER_PACKAGES: Array<{ key: ParterPackageKey; label_ro: string; days: DayCodeUpper[] }> = [
  { key: "PARTER_1DAY_FRI", label_ro: "Parter - Vineri (29.05)", days: ["FRI"] },
  { key: "PARTER_1DAY_SAT", label_ro: "Parter - Sâmbătă (30.05)", days: ["SAT"] },
  { key: "PARTER_1DAY_SUN", label_ro: "Parter - Duminică (31.05)", days: ["SUN"] },
  { key: "PARTER_1DAY_MON", label_ro: "Parter - Luni (01.06)", days: ["MON"] },
  { key: "PARTER_4DAY", label_ro: "Parter - 4 Zile", days: ["FRI", "SAT", "SUN", "MON"] },
];

function parseDaysParam(value: string | null): DayCodeLower[] {
  if (!value) return ["fri", "sat", "sun", "mon"];
  const parts = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const out: DayCodeLower[] = [];
  for (const p of parts) {
    if ((p === "fri" || p === "sat" || p === "sun" || p === "mon") && !out.includes(p as DayCodeLower)) {
      out.push(p as DayCodeLower);
    }
  }
  return out.length ? out : ["fri", "sat", "sun", "mon"];
}

function toInt(v: unknown, fallback = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function parseCanonicalDaySet(raw: unknown): DayCodeUpper[] {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (!s) return ["FRI", "SAT", "SUN", "MON"]; // 4-day includes all days
  const parts = s.split(/[^A-Z]+/).filter(Boolean);
  const unique = Array.from(new Set(parts));
  return unique.filter((d): d is DayCodeUpper =>
    d === "FRI" || d === "SAT" || d === "SUN" || d === "MON" ? true : false,
  );
}

function isPaidOrder(o: {
  status?: string | null;
  payment_status?: string | null;
}) {
  const s = String(o.status ?? "").toLowerCase();
  const ps = String(o.payment_status ?? "").toLowerCase();
  return s === "paid" || ps === "paid";
}

export async function GET(req: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: { message: "Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL" },
        },
        { status: 500 },
      );
    }
    if (!serviceKey) {
      return NextResponse.json(
        { ok: false, error: { message: "Missing SUPABASE_SERVICE_ROLE_KEY" } },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const url = new URL(req.url);
    const daysLower = parseDaysParam(url.searchParams.get("days"));
    const daysUpper = daysLower.map((d) => DAY_UPPER[d]);

    // 1) event_days for requested days
    const { data: eventDays, error: eventDaysErr } = await supabase
      .from("event_days")
      .select("id, day_code, event_date, label_ro")
      .in("day_code", daysUpper);

    if (eventDaysErr) throw eventDaysErr;

    const dayCodeToEventDayId = new Map<DayCodeUpper, string>();
    const dayMeta = new Map<
      DayCodeUpper,
      { event_date?: string | null; label_ro?: string | null }
    >();

    for (const d of eventDays || []) {
      const code = String((d as any).day_code).toUpperCase() as DayCodeUpper;
      if (code === "FRI" || code === "SAT" || code === "SUN" || code === "MON") {
        dayCodeToEventDayId.set(code, String((d as any).id));
        dayMeta.set(code, {
          event_date: (d as any).event_date ?? null,
          label_ro: (d as any).label_ro ?? null,
        });
      }
    }

    const eventDayIds = Array.from(dayCodeToEventDayId.values());

    // If no event_days configured, return defaults
    if (eventDayIds.length === 0) {
      const empty: Record<DayCodeUpper, any> = {
        FRI: {
          cap: PARTER_CAP_PER_DAY,
          sold: 0,
          remaining: PARTER_CAP_PER_DAY,
          day_code: "FRI",
          ...dayMeta.get("FRI"),
        },
        SAT: {
          cap: PARTER_CAP_PER_DAY,
          sold: 0,
          remaining: PARTER_CAP_PER_DAY,
          day_code: "SAT",
          ...dayMeta.get("SAT"),
        },
        SUN: {
          cap: PARTER_CAP_PER_DAY,
          sold: 0,
          remaining: PARTER_CAP_PER_DAY,
          day_code: "SUN",
          ...dayMeta.get("SUN"),
        },
        MON: {
          cap: PARTER_CAP_PER_DAY,
          sold: 0,
          remaining: PARTER_CAP_PER_DAY,
          day_code: "MON",
          ...dayMeta.get("MON"),
        },
      };

      const byPackage = PARTER_PACKAGES.reduce<Record<string, PackageAvailability>>(
        (acc, p) => {
          let remaining = PARTER_CAP_PER_DAY;
          if (p.days.length === 1) {
            remaining = empty[p.days[0]]?.remaining ?? PARTER_CAP_PER_DAY;
          } else if (p.days.length === 4) {
            remaining = Math.min(
              empty.FRI?.remaining ?? PARTER_CAP_PER_DAY,
              empty.SAT?.remaining ?? PARTER_CAP_PER_DAY,
              empty.SUN?.remaining ?? PARTER_CAP_PER_DAY,
              empty.MON?.remaining ?? PARTER_CAP_PER_DAY,
            );
          }
          acc[p.key] = { key: p.key, label_ro: p.label_ro, days: p.days, remaining };
          return acc;
        },
        {},
      );

      return NextResponse.json({
        ok: true,
        capPerDay: PARTER_CAP_PER_DAY,
        byDay: empty,
        byPackage,
      });
    }

    // 2) order_item_days rows for these days
    const { data: oidRows, error: oidErr } = await supabase
      .from("order_item_days")
      .select("order_item_id, event_day_id")
      .in("event_day_id", eventDayIds);

    if (oidErr) throw oidErr;

    const orderItemIdsWithDays = Array.from(
      new Set((oidRows || []).map((r: any) => String(r.order_item_id))),
    );

    // 3) load order_items for those ids (filter for parter category)
    let itemsById = new Map<
      string,
      {
        id: string;
        order_id: string;
        quantity: number;
        category: string;
        canonical_day_set?: string | null;
      }
    >();

    let paidOrderIds = new Set<string>();

    if (orderItemIdsWithDays.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("id, order_id, quantity, category, canonical_day_set")
        .in("id", orderItemIdsWithDays)
        .eq("category", "parter");

      if (itemsErr) throw itemsErr;

      for (const it of items || []) {
        const id = String((it as any).id);
        itemsById.set(id, {
          id,
          order_id: String((it as any).order_id),
          quantity: toInt((it as any).quantity, 0),
          category: String((it as any).category ?? ""),
          canonical_day_set: (it as any).canonical_day_set ?? null,
        });
      }

      // 4) load orders for those items and filter paid
      const orderIds = Array.from(
        new Set((items || []).map((it: any) => String(it.order_id))),
      );

      if (orderIds.length > 0) {
        // Fetch orders in batches to avoid header overflow
        const batchSize = 100;
        for (let i = 0; i < orderIds.length; i += batchSize) {
          const batch = orderIds.slice(i, i + batchSize);
          const { data: orders, error: ordersErr } = await supabase
            .from("orders")
            .select("id, status, payment_status")
            .in("id", batch);

          if (ordersErr) throw ordersErr;

          for (const o of orders || []) {
            if (isPaidOrder(o as any)) paidOrderIds.add(String((o as any).id));
          }
        }
      }
    }

    // 5) sold count from order_item_days + paid orders + parter category
    const soldByDayCode: Record<DayCodeUpper, number> = {
      FRI: 0,
      SAT: 0,
      SUN: 0,
      MON: 0,
    };

    const eventDayIdToDayCode = new Map<string, DayCodeUpper>();
    for (const [code, id] of dayCodeToEventDayId.entries()) {
      eventDayIdToDayCode.set(id, code);
    }

    for (const row of oidRows || []) {
      const orderItemId = String((row as any).order_item_id);
      const eventDayId = String((row as any).event_day_id);
      const code = eventDayIdToDayCode.get(eventDayId);
      if (!code) continue;

      const item = itemsById.get(orderItemId);
      if (!item) continue;

      // Only count parter category
      if (String(item.category).toLowerCase() !== "parter") continue;

      // Only count paid orders
      if (!paidOrderIds.has(item.order_id)) continue;

      soldByDayCode[code] += Math.max(0, toInt(item.quantity, 0));
    }

    // 6) Fallback: paid parter order_items that might be missing order_item_days
    // Only query items linked to the event days we care about
    if (paidOrderIds.size > 0 && eventDayIds.length > 0) {
      // Get all order_item_ids linked to our event days (even if not already counted)
      const { data: allOidRows, error: allOidErr } = await supabase
        .from("order_item_days")
        .select("order_item_id, event_day_id")
        .in("event_day_id", eventDayIds);

      if (!allOidErr && allOidRows && allOidRows.length > 0) {
        const allOrderItemIds = Array.from(
          new Set((allOidRows || []).map((r: any) => String(r.order_item_id))),
        );

        if (allOrderItemIds.length > 0) {
          const { data: allParterItems, error: allParterErr } = await supabase
            .from("order_items")
            .select("id, order_id, quantity, category, canonical_day_set")
            .in("id", allOrderItemIds)
            .eq("category", "parter");

          if (!allParterErr && allParterItems && allParterItems.length > 0) {
            const alreadyCountedIds = new Set(orderItemIdsWithDays);
            for (const it of allParterItems as any[]) {
              const orderId = String(it.order_id);
              if (!paidOrderIds.has(orderId)) continue; // Only paid orders

              const id = String(it.id);
              if (alreadyCountedIds.has(id)) continue; // Skip already counted

              const qty = Math.max(0, toInt(it.quantity, 0));
              if (qty <= 0) continue;

              const days = parseCanonicalDaySet(it.canonical_day_set);
              for (const d of days) {
                // only within requested days
                if (!daysUpper.includes(d)) continue;
                soldByDayCode[d] += qty;
              }
            }
          }
        }
      }
    }

    // 7) Build response for all days
    const byDay: Record<DayCodeUpper, any> = {
      FRI: null,
      SAT: null,
      SUN: null,
      MON: null,
    };

    for (const d of ["FRI", "SAT", "SUN", "MON"] as const) {
      const sold = soldByDayCode[d] || 0;
      const remaining = Math.max(0, PARTER_CAP_PER_DAY - sold);
      byDay[d] = {
        day_code: d,
        cap: PARTER_CAP_PER_DAY,
        sold,
        remaining,
        ...dayMeta.get(d),
      };
    }

    const remainingByDay: Record<DayCodeUpper, number> = {
      FRI: toInt(byDay.FRI?.remaining, 0),
      SAT: toInt(byDay.SAT?.remaining, 0),
      SUN: toInt(byDay.SUN?.remaining, 0),
      MON: toInt(byDay.MON?.remaining, 0),
    };

    const byPackage = PARTER_PACKAGES.reduce<Record<string, PackageAvailability>>(
      (acc, p) => {
        let remaining = PARTER_CAP_PER_DAY;
        if (p.days.length === 1) {
          const dayKey = p.days[0];
          remaining = remainingByDay[dayKey] ?? 0;
        } else if (p.days.length === 4) {
          // 4-day: remaining is the minimum across all days
          remaining = Math.min(
            remainingByDay.FRI,
            remainingByDay.SAT,
            remainingByDay.SUN,
            remainingByDay.MON,
          );
        }
        acc[p.key] = { key: p.key, label_ro: p.label_ro, days: p.days, remaining };
        return acc;
      },
      {},
    );

    return NextResponse.json({
      ok: true,
      capPerDay: PARTER_CAP_PER_DAY,
      byDay,
      byPackage,
    });
  } catch (error) {
    console.error("[GET /api/parter/availability] error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error in parter availability";
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 },
    );
  }
}

// app/api/fanpit/availability/route.ts
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

const DEFAULT_DAYS: DayCodeLower[] = ["fri", "sat", "sun", "mon"];


// ✅ Your requested limit:
const FANPIT_CAP_PER_DAY = 2000;

type FanPitPackageKey =
  | "FANPIT_1DAY"
  | "FANPIT_2DAY_FRI_SUN"
  | "FANPIT_2DAY_FRI_MON"
  | "FANPIT_2DAY_SUN_MON"
  | "FANPIT_3DAY_FRI_SUN_MON"
  | "FANPIT_4DAY_ALL";

type PackageAvailability = {
  key: FanPitPackageKey;
  label_ro: string;
  days: DayCodeUpper[];
  remaining: number;
};

const FANPIT_PACKAGES: Array<{ key: FanPitPackageKey; label_ro: string; days: DayCodeUpper[] }> = [
  { key: "FANPIT_1DAY", label_ro: "Fan Pit - 1 zi", days: [] },
  { key: "FANPIT_2DAY_FRI_SUN", label_ro: "Fan Pit - 2 zile (Vineri + Duminică)", days: ["FRI", "SUN"] },
  { key: "FANPIT_2DAY_FRI_MON", label_ro: "Fan Pit - 2 zile (Vineri + Luni)", days: ["FRI", "MON"] },
  { key: "FANPIT_2DAY_SUN_MON", label_ro: "Fan Pit - 2 zile (Duminică + Luni)", days: ["SUN", "MON"] },
  { key: "FANPIT_3DAY_FRI_SUN_MON", label_ro: "Fan Pit - 3 zile (Vineri + Duminică + Luni)", days: ["FRI", "SUN", "MON"] },
  { key: "FANPIT_4DAY_ALL", label_ro: "Fan Pit - 4 zile", days: ["FRI", "SAT", "SUN", "MON"] },
];

function minRemainingForDays(
  remainingByDay: Record<DayCodeUpper, number>,
  days: DayCodeUpper[],
) {
  if (!days.length) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const d of days) {
    const v = remainingByDay[d];
    if (!Number.isFinite(v)) return 0;
    if (v < min) min = v;
  }
  return Number.isFinite(min) ? Math.max(0, min) : 0;
}

function parseDaysParam(value: string | null): DayCodeLower[] {
  if (!value) return DEFAULT_DAYS;
  const parts = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const out: DayCodeLower[] = [];
  for (const p of parts) {
    if (p === "fri" || p === "sat" || p === "sun" || p === "mon") out.push(p);
  }
  return out.length ? Array.from(new Set(out)) : DEFAULT_DAYS;
}

function toInt(v: unknown, fallback = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function parseCanonicalDaySet(raw: unknown): DayCodeUpper[] {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (!s) return [];
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
      if (
        code === "FRI" ||
        code === "SAT" ||
        code === "SUN" ||
        code === "MON"
      ) {
        dayCodeToEventDayId.set(code, String((d as any).id));
        dayMeta.set(code, {
          event_date: (d as any).event_date ?? null,
          label_ro: (d as any).label_ro ?? null,
        });
      }
    }

    const eventDayIds = Array.from(dayCodeToEventDayId.values());
    if (eventDayIds.length === 0) {
      // no event_days configured
      const empty: Record<DayCodeUpper, any> = {
        FRI: null,
        SAT: null,
        SUN: null,
        MON: null,
      };
      for (const du of daysUpper) {
        empty[du] = {
          cap: FANPIT_CAP_PER_DAY,
          sold: 0,
          remaining: FANPIT_CAP_PER_DAY,
          day_code: du,
          ...dayMeta.get(du),
        };
      }

      const remainingByDay: Record<DayCodeUpper, number> = {
        FRI: (empty.FRI?.remaining as number) ?? FANPIT_CAP_PER_DAY,
        SAT: (empty.SAT?.remaining as number) ?? FANPIT_CAP_PER_DAY,
        SUN: (empty.SUN?.remaining as number) ?? FANPIT_CAP_PER_DAY,
        MON: (empty.MON?.remaining as number) ?? FANPIT_CAP_PER_DAY,
      };

      const byPackage = FANPIT_PACKAGES.reduce<Record<string, PackageAvailability>>(
        (acc, p) => {
          // FANPIT_1DAY is handled on frontend per-day; here we expose per-day remaining via byDay.
          if (p.key === "FANPIT_1DAY") return acc;
          const remaining = minRemainingForDays(remainingByDay, p.days);
          acc[p.key] = { key: p.key, label_ro: p.label_ro, days: p.days, remaining };
          return acc;
        },
        {},
      );

      return NextResponse.json({
        ok: true,
        capPerDay: FANPIT_CAP_PER_DAY,
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

    // 3) load order_items for those ids
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
        .in("id", orderItemIdsWithDays);

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
        const { data: orders, error: ordersErr } = await supabase
          .from("orders")
          .select("id, status, payment_status")
          .in("id", orderIds);

        if (ordersErr) throw ordersErr;

        for (const o of orders || []) {
          if (isPaidOrder(o as any)) paidOrderIds.add(String((o as any).id));
        }
      }
    }

    // 5) sold count from order_item_days + paid orders + general category
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

      // Fan Pit = category 'general' in DB
      if (String(item.category).toLowerCase() !== "general") continue;

      // Only count paid orders
      if (!paidOrderIds.has(item.order_id)) continue;

      soldByDayCode[code] += Math.max(0, toInt(item.quantity, 0));
    }

    // 6) Fallback: paid general order_items that have canonical_day_set but are missing order_item_days
    //    (only if your system sometimes doesn't write order_item_days for multi-day products)
    if (paidOrderIds.size > 0) {
      let query = supabase
        .from("order_items")
        .select("id, order_id, quantity, category, canonical_day_set")
        .in("order_id", Array.from(paidOrderIds))
        .eq("category", "general");

      // exclude those already counted via order_item_days
      if (orderItemIdsWithDays.length > 0) {
        query = query.not(
          "id",
          "in",
          `(${orderItemIdsWithDays.map((x) => `"${x}"`).join(",")})`,
        );
      }

      const { data: missingDayItems, error: missingErr } = await query;

      if (!missingErr && missingDayItems && missingDayItems.length > 0) {
        for (const it of missingDayItems as any[]) {
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

    // 7) Build response only for requested days
    const byDay: Record<DayCodeUpper, any> = {
      FRI: null,
      SAT: null,
      SUN: null,
      MON: null,
    };

    for (const d of daysUpper) {
      const sold = soldByDayCode[d] || 0;
      const remaining = Math.max(0, FANPIT_CAP_PER_DAY - sold);
      byDay[d] = {
        day_code: d,
        cap: FANPIT_CAP_PER_DAY,
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

    const byPackage = FANPIT_PACKAGES.reduce<Record<string, PackageAvailability>>(
      (acc, p) => {
        if (p.key === "FANPIT_1DAY") return acc;
        const remaining = minRemainingForDays(remainingByDay, p.days);
        acc[p.key] = { key: p.key, label_ro: p.label_ro, days: p.days, remaining };
        return acc;
      },
      {},
    );

    return NextResponse.json({
      ok: true,
      capPerDay: FANPIT_CAP_PER_DAY,
      byDay,
      byPackage,
    });
  } catch (error) {
    console.error("[GET /api/fanpit/availability] error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error in availability";
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 },
    );
  }
}

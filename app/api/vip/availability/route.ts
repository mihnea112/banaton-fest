// app/api/vip/availability/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DayCodeLower = "fri" | "sat" | "sun" | "mon";
type DayCodeUpper = "FRI" | "SAT" | "SUN" | "MON";

const TABLE_CAPACITY = 6;

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.DATABASE_URL; // dacă ai migrat; ignorat dacă nu e URL supabase

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing env vars: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeDayLower(v: unknown): DayCodeLower | null {
  const x = String(v ?? "")
    .trim()
    .toLowerCase();
  if (x === "fri" || x === "sat" || x === "sun" || x === "mon") return x;
  return null;
}

function lowerToUpper(d: DayCodeLower): DayCodeUpper {
  if (d === "fri") return "FRI";
  if (d === "sat") return "SAT";
  if (d === "sun") return "SUN";
  return "MON";
}

function nowIso() {
  return new Date().toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const daysParam = req.nextUrl.searchParams.get("days") || "";
    const includeHoldsParam =
      (req.nextUrl.searchParams.get("includeHolds") || "true").toLowerCase() ===
      "true";

    const daysLower = Array.from(
      new Set(
        daysParam
          .split(",")
          .map((s) => normalizeDayLower(s))
          .filter(Boolean) as DayCodeLower[],
      ),
    );

    // Dacă nu trimite zile, tot returnăm mesele cu remainingMin = capacity
    const daysUpper = daysLower.map(lowerToUpper);

    // 1) Load vip tables (schema-robust)
    // NOTE: do NOT select columns that may not exist (ex: `name`).
    // We select * and normalize in JS so schema tweaks don't break the endpoint.
    let tables: any[] | null = null;

    try {
      const q1 = await supabase
        .from("vip_tables")
        .select("*")
        .order("table_number", { ascending: true });

      if (q1.error) throw q1.error;
      tables = (q1.data as any[]) ?? [];
    } catch {
      const q2 = await supabase.from("vip_tables").select("*");
      if (q2.error) throw q2.error;
      tables = (q2.data as any[]) ?? [];
    }

    const tableRows = (tables ?? []).map((t: any) => {
      const tableNumber =
        typeof t.table_number === "number"
          ? t.table_number
          : typeof t.number === "number"
            ? t.number
            : null;

      const label =
        (typeof t.label === "string" && t.label.trim() ? t.label.trim() : null) ||
        (typeof t.table_label === "string" && t.table_label.trim()
          ? t.table_label.trim()
          : null) ||
        (typeof t.display_label === "string" && t.display_label.trim()
          ? t.display_label.trim()
          : null) ||
        (typeof t.code === "string" && t.code.trim() ? t.code.trim() : null) ||
        (tableNumber !== null ? `Masa ${tableNumber}` : null) ||
        String(t.id);

      const capacityRaw =
        t.capacity ??
        t.seats_capacity ??
        t.max_seats ??
        t.max_capacity ??
        t.seats ??
        t.default_capacity;

      const capacityNum = Number(capacityRaw);
      const capacity = Number.isFinite(capacityNum) && capacityNum > 0
        ? capacityNum
        : TABLE_CAPACITY;

      return {
        id: String(t.id),
        label,
        capacity,
      };
    });

    // Dacă nu avem zile, nu scădem nimic (totul pare liber)
    if (daysUpper.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          days: daysLower,
          tables: tableRows.map((t) => ({
            ...t,
            remainingByDay: {},
            remainingMin: t.capacity,
          })),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 2) Load event_days and map requested codes to event_day_ids
    const { data: eventDaysRows, error: eventDaysErr } = await supabase
      .from("event_days")
      .select("*");
    if (eventDaysErr) throw eventDaysErr;

    // For each event_day row, extract a normalized day code
    function extractDayCode(row: any): DayCodeUpper | null {
      const candidates = [
        row.code,
        row.day_code,
        row.dayCode,
        row.slug,
        row.name,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.trim()) {
          const val = c.trim().toUpperCase();
          // Try to match FRI/SAT/SUN/MON
          for (const d of ["FRI", "SAT", "SUN", "MON"]) {
            if (val === d) return d as DayCodeUpper;
            if (val.startsWith(d)) return d as DayCodeUpper;
            if (val.slice(0, 3) === d) return d as DayCodeUpper;
          }
        }
      }
      return null;
    }
    // Build map: day code (upper) -> event_day row
    const eventDayCodeToRow: Partial<Record<DayCodeUpper, any>> = {};
    for (const row of eventDaysRows ?? []) {
      const code = extractDayCode(row);
      if (code) {
        eventDayCodeToRow[code] = row;
      }
    }
    // Map requested daysUpper to eventDayIds
    const eventDayIds: string[] = [];
    const eventDayIdToDayCode: Record<string, DayCodeUpper> = {};
    for (const d of daysUpper) {
      const row = eventDayCodeToRow[d];
      if (row && row.id != null) {
        eventDayIds.push(String(row.id));
        eventDayIdToDayCode[String(row.id)] = d;
      }
    }
    // If no eventDayIds found for requested days, return all tables with full capacity
    if (eventDayIds.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          days: daysLower,
          tables: tableRows.map((t) => ({
            ...t,
            remainingByDay: Object.fromEntries(
              daysUpper.map((d) => [d.toLowerCase(), t.capacity]),
            ),
            remainingMin: t.capacity,
          })),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 3) Load vip_table_reservation_days for requested event_day_ids
    const { data: dayRows, error: dayRowsErr } = await supabase
      .from("vip_table_reservation_days")
      .select("*")
      .in("event_day_id", eventDayIds);
    if (dayRowsErr) throw dayRowsErr;

    // 4) Extract reservation ids using only vip_table_reservation_id
    const reservationIds = Array.from(
      new Set(
        (dayRows ?? [])
          .map((r: any) => r.vip_table_reservation_id)
          .filter((x: any) => x !== null && x !== undefined)
          .map((x: any) => String(x)),
      ),
    );

    // 5) Load reservations for those ids (if any)
    const reservationsById = new Map<string, any>();
    if (reservationIds.length > 0) {
      const { data: reservations, error: reservationsErr } = await supabase
        .from("vip_table_reservations")
        .select("*")
        .in("id", reservationIds);
      if (reservationsErr) throw reservationsErr;
      for (const r of (reservations ?? []) as any[]) {
        reservationsById.set(String(r.id), r);
      }
    }

    // 6) If includeHoldsParam is false, filter out reservations with unpaid orders
    let paidOrderIds = new Set<string>();
    if (!includeHoldsParam && reservationsById.size > 0) {
      // Get all order_ids from reservations
      const orderIds = Array.from(reservationsById.values())
        .map((r) => r.order_id)
        .filter((id) => id != null)
        .map((id) => String(id));
      if (orderIds.length > 0) {
        const { data: orders, error: ordersErr } = await supabase
          .from("orders")
          .select("id, status, payment_status")
          .in("id", orderIds);
        if (ordersErr) throw ordersErr;
        paidOrderIds = new Set(
          (orders ?? [])
            .filter((o: any) => {
              const status = (o.status ?? "").toLowerCase();
              const paymentStatus = (o.payment_status ?? "").toLowerCase();
              return status === "paid" || paymentStatus === "paid";
            })
            .map((o: any) => String(o.id)),
        );
      }
    }

    // 7) Aggregate: used seats per table per day
    const usedByTableDay = new Map<string, Map<DayCodeUpper, number>>();
    for (const row of (dayRows ?? []) as any[]) {
      // Map event_day_id to day code
      const eventDayId = row.event_day_id != null ? String(row.event_day_id) : null;
      const day: DayCodeUpper | undefined = eventDayId ? eventDayIdToDayCode[eventDayId] : undefined;
      if (!day || !daysUpper.includes(day)) continue;

      // Get reservation row
      const reservationId = row.vip_table_reservation_id != null ? String(row.vip_table_reservation_id) : null;
      const reservation = reservationId ? reservationsById.get(reservationId) : null;
      // Filter out unpaid orders if needed
      if (!includeHoldsParam && reservation) {
        const orderId = reservation.order_id != null ? String(reservation.order_id) : null;
        if (!orderId || !paidOrderIds.has(orderId)) {
          continue;
        }
      }
      // Table id is reservation.vip_table_id (string)
      const tableId = reservation && reservation.vip_table_id != null ? String(reservation.vip_table_id) : null;
      if (!tableId) continue;
      // Seats reserved for this day: prefer row.seats_reserved, fallback to reservation.seats_reserved
      let seats = Number.isFinite(row.seats_reserved) ? Number(row.seats_reserved) : undefined;
      if (!Number.isFinite(seats) || seats === undefined) {
        seats = Number.isFinite(reservation?.seats_reserved) ? Number(reservation.seats_reserved) : 0;
      }
      if (!Number.isFinite(seats) || seats <= 0) continue;
      let byDay = usedByTableDay.get(tableId);
      if (!byDay) {
        byDay = new Map();
        usedByTableDay.set(tableId, byDay);
      }
      byDay.set(day, (byDay.get(day) || 0) + seats);
    }

    // 8) Build response
    const tablesOut = tableRows.map((t) => {
      const byDay = usedByTableDay.get(t.id);
      const remainingByDay: Record<string, number> = {};
      let minRemaining = t.capacity;
      for (const d of daysUpper) {
        const used = byDay?.get(d) || 0;
        const remaining = Math.max(0, t.capacity - used);
        remainingByDay[d.toLowerCase()] = remaining;
        if (remaining < minRemaining) minRemaining = remaining;
      }
      return {
        ...t,
        remainingByDay,
        remainingMin: minRemaining,
      };
    });

    return NextResponse.json(
      { ok: true, days: daysLower, tables: tablesOut },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[GET /api/vip/availability] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

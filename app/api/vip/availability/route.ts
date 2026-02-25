import { supabaseAdmin } from "@/lib/supabase-admin";
import { badRequest, ok, serverError } from "@/lib/api";
import { groupIntoRows, toInt } from "@/lib/vip";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const publicToken = searchParams.get("publicToken");
    const dayCode = (searchParams.get("dayCode") || "").toUpperCase();

    if (!publicToken) return badRequest("Lipsește publicToken.");
    if (!["FRI", "SAT", "SUN", "MON"].includes(dayCode)) {
      return badRequest(
        "dayCode invalid. Valori acceptate: FRI, SAT, SUN, MON.",
      );
    }

    // Resolve order (optional but useful for flow validation)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, public_token, status")
      .eq("public_token", publicToken)
      .maybeSingle();

    if (orderError)
      return serverError("Eroare la citirea comenzii.", orderError);
    if (!order) return badRequest("Comanda nu există.");
    if (order.status !== "draft")
      return badRequest("Comanda nu mai este editabilă.");

    // Day lookup
    const { data: eventDay, error: eventDayError } = await supabaseAdmin
      .from("event_days")
      .select("id, day_code, label")
      .eq("day_code", dayCode)
      .maybeSingle();

    if (eventDayError)
      return serverError(
        "Eroare la citirea zilei de eveniment.",
        eventDayError,
      );
    if (!eventDay) return badRequest("Ziua nu există în event_days.");

    // Load all VIP structures
    const [zonesRes, tablesRes, dayAvailRes] = await Promise.all([
      supabaseAdmin
        .from("vip_table_zones")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),

      supabaseAdmin
        .from("vip_tables")
        .select("*")
        .eq("is_active", true)
        .order("zone_id", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("table_number", { ascending: true }),

      supabaseAdmin
        .from("vip_table_day_availability")
        .select("*")
        .eq("event_day_id", eventDay.id),
    ]);

    if (zonesRes.error)
      return serverError("Eroare la citirea zonelor VIP.", zonesRes.error);
    if (tablesRes.error)
      return serverError("Eroare la citirea meselor VIP.", tablesRes.error);
    if (dayAvailRes.error)
      return serverError(
        "Eroare la citirea disponibilității pe zi.",
        dayAvailRes.error,
      );

    const zones = zonesRes.data ?? [];
    const tables = tablesRes.data ?? [];
    const dayAvail = dayAvailRes.data ?? [];

    // Existing reservations for this day (all orders except cancelled/expired if you use such statuses)
    const { data: reservedRows, error: reservedError } = await supabaseAdmin
      .from("vip_table_reservation_days")
      .select(
        `
        id,
        event_day_id,
        vip_table_reservation_id,
        vip_table_reservations:vip_table_reservation_id (
          id,
          vip_table_id,
          seats_reserved,
          reservation_status
        )
      `,
      )
      .eq("event_day_id", eventDay.id);

    if (reservedError)
      return serverError("Eroare la citirea rezervărilor VIP.", reservedError);

    // Sum reserved seats per table for this day
    const reservedByTableId = new Map<string, number>();

    for (const row of reservedRows ?? []) {
      const reservation = (row as any).vip_table_reservations;
      if (!reservation) continue;

      const status = String(
        reservation.reservation_status || "active",
      ).toLowerCase();
      // Exclude cancelled/expired reservations from occupancy
      if (["cancelled", "expired"].includes(status)) continue;

      const tableId = reservation.vip_table_id as string;
      const seats = toInt(reservation.seats_reserved);

      reservedByTableId.set(
        tableId,
        (reservedByTableId.get(tableId) ?? 0) + seats,
      );
    }

    // Optional base availability overrides per day
    const availByTableId = new Map<string, any>();
    for (const a of dayAvail) {
      availByTableId.set(a.vip_table_id, a);
    }

    const zoneMap = new Map(zones.map((z) => [z.id, z]));

    const tablesWithAvailability = tables.map((t) => {
      const dayCfg = availByTableId.get(t.id);
      const capacity = dayCfg?.capacity_override ?? t.capacity ?? 0;
      const isEnabled = dayCfg?.is_enabled ?? true;

      const reservedSeats = reservedByTableId.get(t.id) ?? 0;
      const emptySeats = isEnabled ? Math.max(0, capacity - reservedSeats) : 0;

      return {
        id: t.id,
        zoneId: t.zone_id,
        tableNumber: t.table_number,
        label: t.label ?? `Masa ${t.table_number}`,
        capacity,
        reservedSeats,
        emptySeats,
        isEnabled,
        isAvailable: isEnabled && emptySeats > 0,
        sortOrder: t.sort_order ?? 0,
      };
    });

    const zonesPayload = zones.map((z) => {
      const zoneTables = tablesWithAvailability
        .filter((t) => t.zoneId === z.id)
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.tableNumber - b.tableNumber;
        });

      const totalCapacity = zoneTables.reduce((s, t) => s + t.capacity, 0);
      const totalEmptySeats = zoneTables.reduce((s, t) => s + t.emptySeats, 0);

      return {
        id: z.id,
        name: z.name,
        code: z.code,
        description: z.description,
        totalTables: zoneTables.length,
        totalCapacity,
        totalEmptySeats,
        tables: zoneTables,
        tableRows: groupIntoRows(zoneTables, 5), // UI helper: 5 per row
      };
    });

    return ok({
      ok: true,
      day: {
        id: eventDay.id,
        dayCode: eventDay.day_code,
        label: eventDay.label,
      },
      zones: zonesPayload,
    });
  } catch (e) {
    return serverError(
      "Eroare neașteptată la disponibilitatea VIP.",
      String(e),
    );
  }
}

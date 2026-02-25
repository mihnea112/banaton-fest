import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type DayCode = "fri" | "sat" | "sun" | "mon";
type DayCodeUpper = "FRI" | "SAT" | "SUN" | "MON";

type VipAllocationInput = {
  tableId?: string;
  tableLabel?: string; // ex: "Masa 12" (fallback dacă nu ai tableId în UI încă)
  dayCodes: DayCode[];
  seats: number;
};

type VipAllocationBody = {
  allocations: VipAllocationInput[];
};

type NormalizedAllocation = {
  tableId: string;
  dayCodes: DayCodeUpper[]; // uppercase: FRI/SAT/SUN/MON
  seats: number;
};

const TABLE_CAPACITY_DEFAULT = 6;
const ORDER_ALLOWED_STATUS = "draft";

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

function normalizeDayCode(day: string): DayCodeUpper | null {
  const d = String(day || "")
    .trim()
    .toUpperCase();

  if (["FRI", "SAT", "SUN", "MON"].includes(d)) return d as DayCodeUpper;
  if (d === "VINERI") return "FRI";
  if (d === "SÂMBĂTĂ" || d === "SAMBATA") return "SAT";
  if (d === "DUMINICĂ" || d === "DUMINICA") return "SUN";
  if (d === "LUNI") return "MON";

  return null;
}

function parseCanonicalDaySet(value: unknown): DayCodeUpper[] {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!raw) return [];

  // suportă "FRI+SAT+SUN+MON", "FRI,SAT", "FRI | SAT" etc.
  const parts = raw.split(/[^A-Z]+/).filter(Boolean);

  const out: DayCodeUpper[] = [];
  const seen = new Set<DayCodeUpper>();

  for (const p of parts) {
    const d = normalizeDayCode(p);
    if (!d) continue;
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }

  return out;
}

function parseTableNumberFromLabel(label?: string | null): number | null {
  if (!label) return null;
  // suportă "Masa 12", "masa 12", "12"
  const m = String(label).match(/(\d+)/);
  if (!m) return null;

  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function sum<T>(arr: T[], getter: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + getter(x), 0);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await ctx.params;

  console.log("[vip-allocation] PUT start", {
    publicToken,
    url: req.url,
    method: req.method,
  });

  let body: VipAllocationBody;
  try {
    body = (await req.json()) as VipAllocationBody;
  } catch (e) {
    console.error("[vip-allocation] invalid json", e);
    return jsonError(400, "Body JSON invalid.");
  }

  console.log("[vip-allocation] raw body", body);

  if (!body || !Array.isArray(body.allocations)) {
    return jsonError(
      400,
      "Payload invalid. 'allocations' trebuie să fie array.",
    );
  }

  if (body.allocations.length === 0) {
    return jsonError(400, "Trimite cel puțin o alocare VIP.");
  }

  // 1) Găsim comanda după public_token
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, public_token, status")
    .eq("public_token", publicToken)
    .maybeSingle();

  console.log("[vip-allocation] order lookup", {
    found: !!order,
    orderId: order?.id,
    status: order?.status,
    orderError,
  });

  if (orderError) {
    return jsonError(500, "Eroare la citirea comenzii.", orderError);
  }

  if (!order) {
    return jsonError(404, "Comanda nu a fost găsită.");
  }

  if (order.status !== ORDER_ALLOWED_STATUS) {
    return jsonError(
      409,
      `Comanda nu mai poate fi modificată (status: ${order.status}).`,
    );
  }

  // 2) Normalizare payload
  const normalizedInput: Array<{
    tableId?: string;
    tableLabel?: string;
    dayCodes: DayCodeUpper[];
    seats: number;
  }> = [];

  for (const [idx, a] of body.allocations.entries()) {
    if (!a || typeof a !== "object") {
      return jsonError(400, `Alocarea #${idx + 1} este invalidă.`);
    }

    const seats = Number(a.seats);
    if (!Number.isInteger(seats) || seats <= 0) {
      return jsonError(
        400,
        `Alocarea #${idx + 1}: 'seats' trebuie să fie integer > 0.`,
      );
    }

    if (!Array.isArray(a.dayCodes) || a.dayCodes.length === 0) {
      return jsonError(
        400,
        `Alocarea #${idx + 1}: 'dayCodes' este obligatoriu.`,
      );
    }

    const dayCodes = Array.from(
      new Set(
        a.dayCodes
          .map((d) => normalizeDayCode(String(d)))
          .filter(Boolean) as DayCodeUpper[],
      ),
    );

    if (dayCodes.length === 0) {
      return jsonError(400, `Alocarea #${idx + 1}: dayCodes invalide.`);
    }

    if (!a.tableId && !a.tableLabel) {
      return jsonError(
        400,
        `Alocarea #${idx + 1}: trimite 'tableId' sau 'tableLabel'.`,
      );
    }

    normalizedInput.push({
      tableId: a.tableId,
      tableLabel: a.tableLabel,
      dayCodes,
      seats,
    });
  }

  console.log("[vip-allocation] normalized input", normalizedInput);

  // 3) Luăm zilele evenimentului (map day_code -> event_day_id)
  const { data: eventDays, error: eventDaysError } = await supabaseAdmin
    .from("event_days")
    .select("id, day_code, day_index")
    .order("day_index", { ascending: true });

  console.log("[vip-allocation] event days", eventDays);

  if (eventDaysError) {
    console.error("[vip-allocation] eventDaysError", eventDaysError);
    return jsonError(
      500,
      "Eroare la citirea zilelor evenimentului.",
      eventDaysError,
    );
  }

  const dayCodeToEventDayId = new Map<DayCodeUpper, string>();
  for (const d of eventDays || []) {
    const key = normalizeDayCode(String(d.day_code || ""));
    if (key) dayCodeToEventDayId.set(key, d.id);
  }

  for (const [i, a] of normalizedInput.entries()) {
    for (const dc of a.dayCodes) {
      if (!dayCodeToEventDayId.has(dc)) {
        return jsonError(
          400,
          `Alocarea #${i + 1}: ziua '${dc}' nu există în event_days.`,
        );
      }
    }
  }

  // 4) Rezolvăm tableId-urile
  const uniqueTableIdsRequested = Array.from(
    new Set(normalizedInput.map((a) => a.tableId).filter(Boolean) as string[]),
  );

  const labelsNeedingResolve = normalizedInput.filter(
    (a) => !a.tableId && a.tableLabel,
  );

  const parsedTableNumbers = Array.from(
    new Set(
      labelsNeedingResolve
        .map((a) => parseTableNumberFromLabel(a.tableLabel))
        .filter((v): v is number => v !== null),
    ),
  );

  const tablesById = new Map<
    string,
    {
      id: string;
      table_number?: number | null;
      label?: string | null;
      capacity?: number | null;
    }
  >();

  if (uniqueTableIdsRequested.length > 0 || parsedTableNumbers.length > 0) {
    if (uniqueTableIdsRequested.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("vip_tables")
        .select("id, table_number, label, capacity")
        .in("id", uniqueTableIdsRequested);

      console.log("[vip-allocation] vip_tables by ids", {
        count: data?.length,
        error,
      });

      if (error) return jsonError(500, "Eroare la citirea meselor VIP.", error);

      for (const t of data || []) {
        tablesById.set(t.id, t);
      }
    }

    if (parsedTableNumbers.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("vip_tables")
        .select("id, table_number, label, capacity")
        .in("table_number", parsedTableNumbers);

      console.log("[vip-allocation] vip_tables by numbers", {
        requested: parsedTableNumbers,
        count: data?.length,
        error,
      });

      if (error) return jsonError(500, "Eroare la citirea meselor VIP.", error);

      for (const t of data || []) {
        tablesById.set(t.id, t);
      }
    }
  }

  const tableNumberToTable = new Map<
    number,
    { id: string; capacity?: number | null }
  >();

  for (const t of tablesById.values()) {
    if (typeof t.table_number === "number") {
      tableNumberToTable.set(t.table_number, {
        id: t.id,
        capacity: t.capacity,
      });
    }
  }

  const normalizedAllocations: NormalizedAllocation[] = [];

  for (const [idx, a] of normalizedInput.entries()) {
    let resolvedTableId: string | null = a.tableId ?? null;

    if (!resolvedTableId && a.tableLabel) {
      const tableNum = parseTableNumberFromLabel(a.tableLabel);

      if (tableNum === null) {
        return jsonError(
          400,
          `Alocarea #${idx + 1}: tableLabel invalid ('${a.tableLabel}').`,
        );
      }

      const resolved = tableNumberToTable.get(tableNum);
      if (!resolved) {
        return jsonError(
          404,
          `Alocarea #${idx + 1}: masa '${a.tableLabel}' nu a fost găsită în vip_tables.`,
        );
      }

      resolvedTableId = resolved.id;
    }

    if (!resolvedTableId) {
      return jsonError(400, `Alocarea #${idx + 1}: nu s-a putut rezolva masa.`);
    }

    if (!tablesById.has(resolvedTableId)) {
      const { data: oneTable, error: oneTableError } = await supabaseAdmin
        .from("vip_tables")
        .select("id, table_number, label, capacity")
        .eq("id", resolvedTableId)
        .maybeSingle();

      console.log("[vip-allocation] one table fetch", {
        resolvedTableId,
        found: !!oneTable,
        oneTableError,
      });

      if (oneTableError) {
        return jsonError(500, "Eroare la citirea mesei VIP.", oneTableError);
      }

      if (!oneTable) {
        return jsonError(404, `Masa VIP (${resolvedTableId}) nu există.`);
      }

      tablesById.set(oneTable.id, oneTable);
    }

    normalizedAllocations.push({
      tableId: resolvedTableId,
      dayCodes: a.dayCodes,
      seats: a.seats,
    });
  }

  console.log("[vip-allocation] normalized allocations", normalizedAllocations);

  // 5) Citim itemele comenzii și calculăm necesarul VIP pe zi
  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from("order_items")
    .select("id, category, quantity, canonical_day_set")
    .eq("order_id", order.id);

  console.log("[vip-allocation] order_items", {
    count: orderItems?.length,
    orderItemsError,
  });

  if (orderItemsError) {
    return jsonError(
      500,
      "Eroare la citirea itemelor comenzii.",
      orderItemsError,
    );
  }

  const vipItems = (
    (orderItems || []) as Array<Record<string, unknown>>
  ).filter((it) => String(it.category ?? "").toLowerCase() === "vip");

  const vipTicketsRequired = sum(vipItems, (it) => Number(it.quantity || 0));

  // IMPORTANT: required by vip_table_reservations.order_item_id (NOT NULL)
  const primaryVipOrderItemId = String(vipItems[0]?.id ?? "").trim();

  const requiredVipSeatsByDay = new Map<DayCodeUpper, number>();

  for (const it of vipItems) {
    const qty = Number(it.quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const days = parseCanonicalDaySet(it.canonical_day_set);

    for (const d of days) {
      requiredVipSeatsByDay.set(d, (requiredVipSeatsByDay.get(d) || 0) + qty);
    }
  }

  const allocatedVipSeatsByDay = new Map<DayCodeUpper, number>();
  for (const a of normalizedAllocations) {
    for (const d of a.dayCodes) {
      allocatedVipSeatsByDay.set(
        d,
        (allocatedVipSeatsByDay.get(d) || 0) + a.seats,
      );
    }
  }

  console.log("[vip-allocation] vip requirements", {
    vipTicketsRequired,
    vipItems: vipItems.map((x) => ({
      id: x.id,
      category: x.category,
      quantity: x.quantity,
      canonical_day_set: x.canonical_day_set,
    })),
    requiredVipSeatsByDay: Object.fromEntries(requiredVipSeatsByDay),
    allocatedVipSeatsByDay: Object.fromEntries(allocatedVipSeatsByDay),
    primaryVipOrderItemId,
  });

  if (vipTicketsRequired <= 0) {
    return jsonError(400, "Comanda nu conține bilete VIP.");
  }

  if (!primaryVipOrderItemId) {
    return jsonError(
      500,
      "Nu s-a putut determina itemul VIP din comandă pentru rezervarea mesei.",
    );
  }

  const totalAllocatedSeats = sum(normalizedAllocations, (a) => a.seats);

  // Validare globală
  if (totalAllocatedSeats !== vipTicketsRequired) {
    return jsonError(
      400,
      `Numărul de locuri VIP alocate (${totalAllocatedSeats}) trebuie să fie egal cu numărul de bilete VIP (${vipTicketsRequired}).`,
      {
        vipTicketsRequired,
        totalAllocatedSeats,
      },
    );
  }

  // Validare pe zi
  const allRelevantDays = new Set<DayCodeUpper>([
    ...requiredVipSeatsByDay.keys(),
    ...allocatedVipSeatsByDay.keys(),
  ]);

  for (const day of allRelevantDays) {
    const required = requiredVipSeatsByDay.get(day) || 0;
    const allocated = allocatedVipSeatsByDay.get(day) || 0;

    if (required !== allocated) {
      return jsonError(
        400,
        `Alocarea VIP pentru ziua ${day} este invalidă: alocate ${allocated}, necesare ${required}.`,
        {
          dayCode: day,
          required,
          allocated,
          requiredVipSeatsByDay: Object.fromEntries(requiredVipSeatsByDay),
          allocatedVipSeatsByDay: Object.fromEntries(allocatedVipSeatsByDay),
        },
      );
    }
  }

  // 6) Expandăm pe (tableId, eventDayId) și agregăm dublurile
  const aggregatedByTableDay = new Map<
    string,
    {
      tableId: string;
      eventDayId: string;
      dayCode: DayCodeUpper;
      seats: number;
    }
  >();

  for (const a of normalizedAllocations) {
    for (const dc of a.dayCodes) {
      const eventDayId = dayCodeToEventDayId.get(dc);
      if (!eventDayId) {
        return jsonError(400, `Zi invalidă în alocare: ${dc}`);
      }

      const key = `${a.tableId}__${eventDayId}`;
      const prev = aggregatedByTableDay.get(key);

      if (prev) {
        prev.seats += a.seats;
      } else {
        aggregatedByTableDay.set(key, {
          tableId: a.tableId,
          eventDayId,
          dayCode: dc,
          seats: a.seats,
        });
      }
    }
  }

  const requestedTableDayRows = Array.from(aggregatedByTableDay.values());
  console.log(
    "[vip-allocation] requested table/day rows",
    requestedTableDayRows,
  );

  // 7) Capacitate: verificăm ocuparea existentă (EXCLUZÂND comanda curentă)
  const requestedTableIds = Array.from(
    new Set(requestedTableDayRows.map((r) => r.tableId)),
  );
  const requestedEventDayIds = Array.from(
    new Set(requestedTableDayRows.map((r) => r.eventDayId)),
  );

  const { data: otherReservations, error: otherReservationsError } =
    await supabaseAdmin
      .from("vip_table_reservations")
      .select("id, order_id, vip_table_id")
      .in("vip_table_id", requestedTableIds)
      .neq("order_id", order.id);

  console.log("[vip-allocation] other reservations", {
    count: otherReservations?.length,
    otherReservationsError,
  });

  if (otherReservationsError) {
    return jsonError(
      500,
      "Eroare la citirea rezervărilor VIP existente.",
      otherReservationsError,
    );
  }

  const otherReservationIds = (otherReservations || []).map((r) => r.id);
  const reservationIdToTableId = new Map<string, string>();

  for (const r of otherReservations || []) {
    reservationIdToTableId.set(r.id, r.vip_table_id);
  }

  const occupiedByTableDay = new Map<string, number>();

  if (otherReservationIds.length > 0) {
    const { data: reservationDays, error: reservationDaysError } =
      await supabaseAdmin
        .from("vip_table_reservation_days")
        .select("vip_table_reservation_id, event_day_id, seats_reserved")
        .in("vip_table_reservation_id", otherReservationIds)
        .in("event_day_id", requestedEventDayIds);

    console.log("[vip-allocation] reservation days occupancy", {
      count: reservationDays?.length,
      reservationDaysError,
    });

    if (reservationDaysError) {
      return jsonError(
        500,
        "Eroare la citirea ocupării pe zile pentru mesele VIP.",
        reservationDaysError,
      );
    }

    for (const rd of reservationDays || []) {
      const tableId = reservationIdToTableId.get(rd.vip_table_reservation_id);
      if (!tableId) continue;

      const key = `${tableId}__${rd.event_day_id}`;
      const prev = occupiedByTableDay.get(key) || 0;
      occupiedByTableDay.set(key, prev + Number(rd.seats_reserved || 0));
    }
  }

  console.log(
    "[vip-allocation] occupiedByTableDay",
    Object.fromEntries(occupiedByTableDay),
  );

  // 8) Validăm capacitatea pe fiecare (masă, zi)
  for (const reqRow of requestedTableDayRows) {
    const table = tablesById.get(reqRow.tableId);
    const capacity =
      Number(table?.capacity ?? TABLE_CAPACITY_DEFAULT) ||
      TABLE_CAPACITY_DEFAULT;

    const key = `${reqRow.tableId}__${reqRow.eventDayId}`;
    const occupied = occupiedByTableDay.get(key) || 0;
    const requested = reqRow.seats;

    console.log("[vip-allocation] capacity check", {
      tableId: reqRow.tableId,
      dayCode: reqRow.dayCode,
      eventDayId: reqRow.eventDayId,
      capacity,
      occupied,
      requested,
      totalAfter: occupied + requested,
    });

    if (requested > capacity) {
      return jsonError(
        409,
        `Alocarea depășește capacitatea mesei (${capacity}) pentru ${reqRow.dayCode}.`,
        {
          tableId: reqRow.tableId,
          dayCode: reqRow.dayCode,
          capacity,
          requested,
        },
      );
    }

    if (occupied + requested > capacity) {
      return jsonError(
        409,
        `Masa selectată nu mai are suficiente locuri disponibile pentru ${reqRow.dayCode}.`,
        {
          tableId: reqRow.tableId,
          dayCode: reqRow.dayCode,
          capacity,
          occupied,
          requested,
          available: Math.max(0, capacity - occupied),
        },
      );
    }
  }

  // 9) Ștergem alocarea veche a comenzii curente (edit/replace)
  const {
    data: currentOrderReservations,
    error: currentOrderReservationsError,
  } = await supabaseAdmin
    .from("vip_table_reservations")
    .select("id")
    .eq("order_id", order.id);

  console.log("[vip-allocation] current order reservations", {
    count: currentOrderReservations?.length,
    currentOrderReservationsError,
  });

  if (currentOrderReservationsError) {
    return jsonError(
      500,
      "Eroare la citirea rezervărilor VIP ale comenzii curente.",
      currentOrderReservationsError,
    );
  }

  const currentReservationIds = (currentOrderReservations || []).map(
    (r) => r.id,
  );

  if (currentReservationIds.length > 0) {
    const { error: deleteDaysError } = await supabaseAdmin
      .from("vip_table_reservation_days")
      .delete()
      .in("vip_table_reservation_id", currentReservationIds);

    console.log("[vip-allocation] delete old reservation days", {
      count: currentReservationIds.length,
      deleteDaysError,
    });

    if (deleteDaysError) {
      return jsonError(
        500,
        "Eroare la ștergerea zilelor rezervării VIP.",
        deleteDaysError,
      );
    }

    const { error: deleteHeadersError } = await supabaseAdmin
      .from("vip_table_reservations")
      .delete()
      .in("id", currentReservationIds);

    console.log("[vip-allocation] delete old reservation headers", {
      count: currentReservationIds.length,
      deleteHeadersError,
    });

    if (deleteHeadersError) {
      return jsonError(
        500,
        "Eroare la ștergerea rezervării VIP.",
        deleteHeadersError,
      );
    }
  }

  // 10) Inserăm noile rezervări (header per masă + rows per zi)
  const uniqueTableIdsInPayload = Array.from(
    new Set(requestedTableDayRows.map((r) => r.tableId)),
  );

  // Unele scheme cer și seats_reserved NOT NULL pe header.
  // Îl calculăm per masă = max(seats) dintre zilele rezervate pentru acea masă
  // (pentru un bilet 4-day cu aceeași masă rămâne 1, nu 4).
  const headerSeatsByTableId = new Map<string, number>();
  for (const row of requestedTableDayRows) {
    const prev = headerSeatsByTableId.get(row.tableId) || 0;
    headerSeatsByTableId.set(row.tableId, Math.max(prev, row.seats));
  }

  const reservationHeadersToInsert = uniqueTableIdsInPayload.map((tableId) => ({
    order_id: order.id,
    order_item_id: primaryVipOrderItemId,
    vip_table_id: tableId,
    seats_reserved: headerSeatsByTableId.get(tableId) || 0,
  }));

  console.log(
    "[vip-allocation] insert reservation headers",
    reservationHeadersToInsert,
  );

  // În unele scheme există coloana seats_reserved pe header, în altele nu.
  // Facem fallback elegant.
  let insertedHeaders:
    | Array<{ id: string; vip_table_id: string }>
    | null
    | undefined = null;

  {
    const baseInsert = await supabaseAdmin
      .from("vip_table_reservations")
      .insert(reservationHeadersToInsert)
      .select("id, vip_table_id");

    console.log("[vip-allocation] insert headers result", {
      label: "base",
      count: baseInsert.data?.length,
      error: baseInsert.error,
    });

    if (baseInsert.error) {
      const msg = String(baseInsert.error.message || "").toLowerCase();

      // fallback dacă schema NU are seats_reserved pe header
      if (
        msg.includes("seats_reserved") &&
        (msg.includes("schema cache") ||
          msg.includes("column") ||
          msg.includes("does not exist"))
      ) {
        const fallbackRows = reservationHeadersToInsert.map(
          ({ seats_reserved: _ignored, ...rest }) => rest,
        );

        const fallbackInsert = await supabaseAdmin
          .from("vip_table_reservations")
          .insert(fallbackRows)
          .select("id, vip_table_id");

        console.log("[vip-allocation] insert headers result", {
          label: "fallback_without_seats_reserved",
          count: fallbackInsert.data?.length,
          error: fallbackInsert.error,
        });

        if (fallbackInsert.error) {
          console.error(
            "[vip-allocation] insertHeadersError (fallback)",
            fallbackInsert.error,
          );
          return jsonError(
            500,
            "Eroare la crearea rezervărilor VIP.",
            fallbackInsert.error,
          );
        }

        insertedHeaders = fallbackInsert.data;
      } else {
        console.error("[vip-allocation] insertHeadersError", baseInsert.error);
        return jsonError(
          500,
          "Eroare la crearea rezervărilor VIP.",
          baseInsert.error,
        );
      }
    } else {
      insertedHeaders = baseInsert.data;
    }
  }

  const tableIdToReservationId = new Map<string, string>();
  for (const h of insertedHeaders || []) {
    tableIdToReservationId.set(h.vip_table_id, h.id);
  }

  const reservationDaysToInsert = requestedTableDayRows.map((row) => {
    const reservationId = tableIdToReservationId.get(row.tableId);
    if (!reservationId) {
      throw new Error(`Missing reservation header for tableId=${row.tableId}`);
    }

    return {
      vip_table_reservation_id: reservationId,
      event_day_id: row.eventDayId,
      seats_reserved: row.seats,
    };
  });

  console.log(
    "[vip-allocation] insert reservation days",
    reservationDaysToInsert,
  );

  const { data: insertedDays, error: insertDaysError } = await supabaseAdmin
    .from("vip_table_reservation_days")
    .insert(reservationDaysToInsert)
    .select("vip_table_reservation_id, event_day_id, seats_reserved");

  if (insertDaysError) {
    console.error("[vip-allocation] insertDaysError", insertDaysError);
    return jsonError(
      500,
      "Eroare la salvarea locurilor rezervate pe zile (VIP).",
      insertDaysError,
    );
  }

  // 11) răspuns
  const response = {
    ok: true,
    data: {
      orderId: order.id,
      publicToken,
      totalVipTicketsRequired: vipTicketsRequired,
      totalSeatsAllocated: totalAllocatedSeats,
      allocationsSaved: normalizedAllocations.length,
      tableDayRowsSaved: insertedDays?.length || 0,
      isComplete: totalAllocatedSeats === vipTicketsRequired,
      requiredVipSeatsByDay: Object.fromEntries(requiredVipSeatsByDay),
      allocatedVipSeatsByDay: Object.fromEntries(allocatedVipSeatsByDay),
    },
  };

  console.log("[vip-allocation] success", response);
  return NextResponse.json(response, { status: 200 });
}

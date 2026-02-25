import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type DayCode = "FRI" | "SAT" | "SUN" | "MON";

function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { ok: false, error: { message, ...(extra || {}) } },
    { status },
  );
}

function normalizeDayCode(input: unknown): DayCode | null {
  const v = String(input ?? "")
    .trim()
    .toUpperCase();
  if (v === "FRI") return "FRI";
  if (v === "SAT") return "SAT";
  if (v === "SUN") return "SUN";
  if (v === "MON") return "MON";
  return null;
}

function toLowerDayCode(input: DayCode): "fri" | "sat" | "sun" | "mon" {
  return input.toLowerCase() as "fri" | "sat" | "sun" | "mon";
}

function safeNum(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseTableNumberFromLabel(label: string): number | null {
  const match = String(label).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) ? n : null;
}

function uniqueLowerDayCodes(
  values: Array<"fri" | "sat" | "sun" | "mon">,
): Array<"fri" | "sat" | "sun" | "mon"> {
  const out: Array<"fri" | "sat" | "sun" | "mon"> = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;

  try {
    console.log("[order-get] start", { publicToken });

    // 1) Get order
    const orderRes = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("public_token", publicToken)
      .maybeSingle();

    console.log("[order-get] order lookup", {
      found: !!orderRes.data,
      error: orderRes.error ?? null,
    });

    if (orderRes.error) {
      return jsonError("Eroare la citirea comenzii.", 500, {
        details: orderRes.error.message,
        code: orderRes.error.code,
      });
    }

    if (!orderRes.data) {
      return jsonError("Comanda nu a fost găsită.", 404);
    }

    const order = orderRes.data as Record<string, unknown>;
    const orderId = String(order.id);

    // 2) Read order_items
    const itemsRes = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemsRes.error) {
      return jsonError("Eroare la citirea itemelor comenzii.", 500, {
        details: itemsRes.error.message,
        code: itemsRes.error.code,
      });
    }

    const rawItems = (itemsRes.data || []) as Array<Record<string, unknown>>;
    const itemIds = rawItems.map((x) => String(x.id ?? "")).filter(Boolean);

    console.log("[order-get] items", {
      count: rawItems.length,
      itemIds,
    });

    // 3) Read order_item_days + event day codes (best-effort)
    const itemDayMap = new Map<string, Array<"fri" | "sat" | "sun" | "mon">>();

    if (itemIds.length > 0) {
      // Try join first
      let dayRows: Array<Record<string, unknown>> | null = null;

      const joinRes = await supabaseAdmin
        .from("order_item_days")
        .select("order_item_id, event_day_id, event_days(day_code)")
        .in("order_item_id", itemIds);

      if (!joinRes.error) {
        dayRows = (joinRes.data || []) as Array<Record<string, unknown>>;
      } else {
        console.warn(
          "[order-get] order_item_days join failed, fallback",
          joinRes.error,
        );

        // Fallback: read links only
        const linksRes = await supabaseAdmin
          .from("order_item_days")
          .select("*")
          .in("order_item_id", itemIds);

        if (linksRes.error) {
          console.warn(
            "[order-get] order_item_days read warning",
            linksRes.error,
          );
        } else {
          const links = (linksRes.data || []) as Array<Record<string, unknown>>;
          const eventDayIds = Array.from(
            new Set(
              links.map((r) => String(r.event_day_id ?? "")).filter(Boolean),
            ),
          );

          let eventDayIdToCode = new Map<string, DayCode>();

          if (eventDayIds.length > 0) {
            const edRes = await supabaseAdmin
              .from("event_days")
              .select("id, day_code")
              .in("id", eventDayIds);

            if (edRes.error) {
              console.warn("[order-get] event_days read warning", edRes.error);
            } else {
              for (const row of (edRes.data || []) as Array<
                Record<string, unknown>
              >) {
                const id = String(row.id ?? "");
                const code = normalizeDayCode(row.day_code);
                if (id && code) eventDayIdToCode.set(id, code);
              }
            }
          }

          // Build map directly from fallback
          for (const row of links) {
            const itemId = String(row.order_item_id ?? "");
            const eventDayId = String(row.event_day_id ?? "");
            const code = eventDayIdToCode.get(eventDayId);
            if (!itemId || !code) continue;

            const lower = toLowerDayCode(code);
            const prev = itemDayMap.get(itemId) || [];
            if (!prev.includes(lower)) prev.push(lower);
            itemDayMap.set(itemId, prev);
          }
        }
      }

      // Process join rows (if join succeeded)
      if (dayRows) {
        for (const row of dayRows) {
          const itemId = String(row.order_item_id ?? "");
          if (!itemId) continue;

          let rawDayCode: unknown = undefined;
          const nested = row.event_days as
            | Record<string, unknown>
            | null
            | undefined;

          if (nested && typeof nested === "object") {
            rawDayCode = nested.day_code;
          }

          const code = normalizeDayCode(rawDayCode);
          if (!code) continue;

          const lower = toLowerDayCode(code);
          const prev = itemDayMap.get(itemId) || [];
          if (!prev.includes(lower)) prev.push(lower);
          itemDayMap.set(itemId, prev);
        }
      }
    }

    // 4) Normalize response items for frontend
    const normalizedItems = rawItems.map((item, index) => {
      const id = String(item.id ?? `item-${index}`);
      const qty = safeNum(item.quantity, 0);

      const unitPrice =
        item.unit_price_ron != null
          ? safeNum(item.unit_price_ron, 0)
          : item.unit_price != null
            ? safeNum(item.unit_price, 0)
            : 0;

      const lineTotal =
        item.line_total_ron != null
          ? safeNum(item.line_total_ron, qty * unitPrice)
          : item.line_total != null
            ? safeNum(item.line_total, qty * unitPrice)
            : qty * unitPrice;

      // name
      const productName = String(
        item.product_name_snapshot ?? item.product_name ?? item.name ?? "Bilet",
      );

      // variant label snapshot (new/old)
      const variantLabel =
        item.variant_label_snapshot != null
          ? String(item.variant_label_snapshot)
          : item.duration_label_snapshot != null
            ? String(item.duration_label_snapshot)
            : null;

      // category enum comes as string
      const categoryRaw = String(item.category ?? "").toLowerCase();
      const category: "general" | "vip" =
        categoryRaw === "vip" ? "vip" : "general";

      // Optional product code may not exist in schema
      const productCode =
        item.product_code != null ? String(item.product_code) : undefined;

      // selectedDayCodes from links
      const selectedDayCodes = itemDayMap.get(id) || [];

      return {
        id,
        productCode,
        category,
        qty,
        unitPrice,
        lineTotal,
        totalPrice: lineTotal,
        name: productName,
        label: productName,
        variantLabel,
        selectedDayCodes,
      };
    });

    // 4.5) Read VIP table allocation (best-effort) for DB-driven VIP page
    let vipAllocation:
      | {
          allocations: Array<{
            reservationId: string;
            tableId: string | null;
            tableLabel: string;
            seats: number;
            dayCodes: Array<"fri" | "sat" | "sun" | "mon">;
          }>;
          selectedTables: string[];
          selectedTable: string | null;
          assignedVipTickets: number;
        }
      | null = null;

    try {
      const reservationsRes = await supabaseAdmin
        .from("vip_table_reservations")
        .select("id, vip_table_id, seats_reserved")
        .eq("order_id", orderId);

      if (reservationsRes.error) {
        console.warn(
          "[order-get] vip_table_reservations read warning",
          reservationsRes.error,
        );
      } else {
        const reservations = (reservationsRes.data || []) as Array<
          Record<string, unknown>
        >;

        if (reservations.length > 0) {
          const reservationIds = reservations
            .map((r) => String(r.id ?? ""))
            .filter(Boolean);
          const tableIds = Array.from(
            new Set(
              reservations
                .map((r) => String(r.vip_table_id ?? ""))
                .filter(Boolean),
            ),
          );

          const tableIdToLabel = new Map<string, string>();

          if (tableIds.length > 0) {
            const vipTablesRes = await supabaseAdmin
              .from("vip_tables")
              .select("id, label, table_number")
              .in("id", tableIds);

            if (vipTablesRes.error) {
              console.warn("[order-get] vip_tables read warning", vipTablesRes.error);
            } else {
              for (const row of (vipTablesRes.data || []) as Array<
                Record<string, unknown>
              >) {
                const id = String(row.id ?? "");
                if (!id) continue;
                const labelRaw = row.label != null ? String(row.label) : "";
                const label =
                  labelRaw.trim() ||
                  (row.table_number != null
                    ? `Masa ${safeNum(row.table_number, 0)}`
                    : "Masă VIP");
                tableIdToLabel.set(id, label);
              }
            }
          }

          const reservationDayMap = new Map<
            string,
            Array<"fri" | "sat" | "sun" | "mon">
          >();

          if (reservationIds.length > 0) {
            let resDayRows: Array<Record<string, unknown>> | null = null;

            const joinDaysRes = await supabaseAdmin
              .from("vip_table_reservation_days")
              .select("vip_table_reservation_id, event_day_id, event_days(day_code)")
              .in("vip_table_reservation_id", reservationIds);

            if (!joinDaysRes.error) {
              resDayRows = (joinDaysRes.data || []) as Array<Record<string, unknown>>;
            } else {
              console.warn(
                "[order-get] vip_table_reservation_days join failed, fallback",
                joinDaysRes.error,
              );

              const linksRes = await supabaseAdmin
                .from("vip_table_reservation_days")
                .select("vip_table_reservation_id, event_day_id")
                .in("vip_table_reservation_id", reservationIds);

              if (linksRes.error) {
                console.warn(
                  "[order-get] vip_table_reservation_days read warning",
                  linksRes.error,
                );
              } else {
                const links = (linksRes.data || []) as Array<Record<string, unknown>>;
                const eventDayIds = Array.from(
                  new Set(
                    links
                      .map((r) => String(r.event_day_id ?? ""))
                      .filter(Boolean),
                  ),
                );

                const eventDayIdToCode = new Map<string, DayCode>();
                if (eventDayIds.length > 0) {
                  const edRes = await supabaseAdmin
                    .from("event_days")
                    .select("id, day_code")
                    .in("id", eventDayIds);

                  if (edRes.error) {
                    console.warn(
                      "[order-get] event_days read warning for vip allocations",
                      edRes.error,
                    );
                  } else {
                    for (const row of (edRes.data || []) as Array<
                      Record<string, unknown>
                    >) {
                      const id = String(row.id ?? "");
                      const code = normalizeDayCode(row.day_code);
                      if (id && code) eventDayIdToCode.set(id, code);
                    }
                  }
                }

                for (const row of links) {
                  const reservationId = String(row.vip_table_reservation_id ?? "");
                  const eventDayId = String(row.event_day_id ?? "");
                  const code = eventDayIdToCode.get(eventDayId);
                  if (!reservationId || !code) continue;
                  const lower = toLowerDayCode(code);
                  const prev = reservationDayMap.get(reservationId) || [];
                  if (!prev.includes(lower)) prev.push(lower);
                  reservationDayMap.set(reservationId, prev);
                }
              }
            }

            if (resDayRows) {
              for (const row of resDayRows) {
                const reservationId = String(row.vip_table_reservation_id ?? "");
                if (!reservationId) continue;

                let rawDayCode: unknown = undefined;
                const nested = row.event_days as
                  | Record<string, unknown>
                  | null
                  | undefined;
                if (nested && typeof nested === "object") {
                  rawDayCode = nested.day_code;
                }

                const code = normalizeDayCode(rawDayCode);
                if (!code) continue;
                const lower = toLowerDayCode(code);
                const prev = reservationDayMap.get(reservationId) || [];
                if (!prev.includes(lower)) prev.push(lower);
                reservationDayMap.set(reservationId, prev);
              }
            }
          }

          const allocations = reservations.map((r) => {
            const reservationId = String(r.id ?? "");
            const tableId = r.vip_table_id != null ? String(r.vip_table_id) : null;
            const seats = safeNum(r.seats_reserved, 0);
            const tableLabel =
              (tableId ? tableIdToLabel.get(tableId) : undefined) || "Masă VIP";
            const dayCodes = uniqueLowerDayCodes(
              reservationDayMap.get(reservationId) || [],
            );

            return {
              reservationId,
              tableId,
              tableLabel,
              seats,
              dayCodes,
            };
          });

          const selectedTables = Array.from(
            new Set(allocations.map((a) => a.tableLabel).filter(Boolean)),
          );

          vipAllocation = {
            allocations,
            selectedTables,
            selectedTable: selectedTables[0] || null,
            assignedVipTickets: allocations.reduce(
              (sum, a) => sum + safeNum(a.seats, 0),
              0,
            ),
          };

          console.log("[order-get] vipAllocation", {
            allocations: allocations.map((a) => ({
              reservationId: a.reservationId,
              tableId: a.tableId,
              tableLabel: a.tableLabel,
              seats: a.seats,
              dayCodes: a.dayCodes,
              tableNumberGuess: parseTableNumberFromLabel(a.tableLabel),
            })),
            selectedTables,
            assignedVipTickets: vipAllocation.assignedVipTickets,
          });
        }
      }
    } catch (vipReadError) {
      console.warn("[order-get] vip allocation read failed", vipReadError);
    }

    // 5) totals (prefer DB totals if available)
    const computedTotalItems = normalizedItems.reduce(
      (s, x) => s + (x.qty || 0),
      0,
    );
    const computedTotalAmount = normalizedItems.reduce(
      (s, x) => s + safeNum(x.lineTotal, 0),
      0,
    );

    const totalItems =
      order.total_items != null
        ? safeNum(order.total_items, computedTotalItems)
        : computedTotalItems;

    const totalAmount =
      order.total_amount != null
        ? safeNum(order.total_amount, computedTotalAmount)
        : order.total != null
          ? safeNum(order.total, computedTotalAmount)
          : computedTotalAmount;

    // Detect VIP
    const hasVip = normalizedItems.some((x) => x.category === "vip");

    return NextResponse.json({
      ok: true,
      order: {
        id: String(order.id),
        publicToken: String(order.public_token ?? publicToken),
        status: String(order.status ?? "draft"),
        totalItems,
        totalAmount,
      },
      hasVip,
      vipAllocation,
      items: normalizedItems,
    });
  } catch (error) {
    console.error("[order-get] unexpected error", error);
    return jsonError("Eroare internă la citirea comenzii.", 500);
  }
}

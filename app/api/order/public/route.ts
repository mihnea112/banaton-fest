import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type DayCode = "FRI" | "SAT" | "SUN" | "MON";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "")
      .trim();
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDayCode(input: unknown): DayCode | null {
  const v = String(input ?? "")
    .trim()
    .toUpperCase();

  if (v === "FRI" || v === "SAT" || v === "SUN" || v === "MON") return v;
  return null;
}

function canonicalDaySetFromCodes(dayCodes: string[]): string | undefined {
  const unique = Array.from(
    new Set(
      dayCodes.map((d) => normalizeDayCode(d)).filter(Boolean) as DayCode[],
    ),
  );

  if (unique.length === 0) return undefined;

  const order: DayCode[] = ["FRI", "SAT", "SUN", "MON"];
  const sorted = unique.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return sorted.join("+");
}

function durationLabelFromCanonical(canonical?: string): string | undefined {
  if (!canonical) return undefined;
  const parts = canonical.split("+").filter(Boolean);

  if (parts.length === 1) {
    if (parts[0] === "FRI") return "Vineri";
    if (parts[0] === "SAT") return "Sâmbătă";
    if (parts[0] === "SUN") return "Duminică";
    if (parts[0] === "MON") return "Luni";
  }

  if (canonical === "FRI+SUN") return "2 zile";
  if (canonical === "FRI+MON") return "2 zile";
  if (canonical === "SUN+MON") return "2 zile";
  if (parts.length === 2) return "2 zile";
  if (parts.length === 3) return "3 zile";
  if (parts.length === 4) return "4 zile";

  return undefined;
}

function pickFirstNumber(
  source: Record<string, unknown>,
  keys: string[],
): number {
  for (const key of keys) {
    if (key in source) {
      const n = toNumber(source[key]);
      if (n > 0) return n;
    }
  }
  return 0;
}

function pickFirstString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json(
        { error: "Missing required query param: token" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // 1) Order by public token
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("public_token", token)
      .maybeSingle();

    if (orderError) {
      console.error("[GET /api/order/public] orders error:", orderError);
      return NextResponse.json(
        { error: "Failed to load order" },
        { status: 500 },
      );
    }

    if (!orderRow) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderAny = orderRow as Record<string, any>;

    // 2) Order items
    const { data: orderItemsRows, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderAny.id)
      .order("id", { ascending: true });

    if (itemsError) {
      console.error("[GET /api/order/public] order_items error:", itemsError);
      return NextResponse.json(
        { error: "Failed to load order items" },
        { status: 500 },
      );
    }

    const orderItems = (orderItemsRows ?? []) as Record<string, unknown>[];

    console.log(
      "[GET /api/order/public] order row keys:",
      Object.keys(orderAny || {}),
    );
    console.log(
      "[GET /api/order/public] raw order items (price-related sample):",
      orderItems.map((item) => ({
        id: item?.id,
        category: item?.category,
        qty: item?.qty,
        quantity: item?.quantity,
        seats: item?.seats,
        tickets_count: item?.tickets_count,
        unit_price: item?.unit_price,
        price: item?.price,
        unitPrice: item?.unitPrice,
        total_price: item?.total_price,
        line_total: item?.line_total,
        total: item?.total,
        lineTotal: item?.lineTotal,
        amount: item?.amount,
        subtotal: item?.subtotal,
        final_price: item?.final_price,
        finalPrice: item?.finalPrice,
        product_name_snapshot: item?.product_name_snapshot,
        name: item?.name,
        label: item?.label,
      })),
    );

    const itemIds = orderItems
      .map((i) => (typeof i.id === "string" ? i.id : null))
      .filter(Boolean) as string[];

    // 3) Order item days (optional, non-blocking)
    let itemDaysRows: Array<Record<string, unknown>> = [];

    if (itemIds.length > 0) {
      const { data: daysData, error: daysError } = await supabase
        .from("order_item_days")
        .select("*")
        .in("order_item_id", itemIds);

      if (daysError) {
        console.warn(
          "[GET /api/order/public] order_item_days warning:",
          daysError,
        );
      } else {
        itemDaysRows = (daysData ?? []) as Array<Record<string, unknown>>;
      }
    }

    const daysByItemId = new Map<string, string[]>();
    for (const row of itemDaysRows) {
      const itemId = String(row.order_item_id ?? "").trim();
      if (!itemId) continue;

      const rawDay =
        row.day_code ?? row.event_day_code ?? row.code ?? row.day ?? null;
      const dayCode = normalizeDayCode(rawDay);
      if (!dayCode) continue;

      const arr = daysByItemId.get(itemId) ?? [];
      arr.push(dayCode);
      daysByItemId.set(itemId, arr);
    }

    // 4) VIP table reservation summary (optional)
    let vipTableSelection:
      | {
          selectedTable?: string;
          selectedTables?: string[];
          tablesRequired?: number;
          assignedVipTickets?: number;
        }
      | undefined =
      (orderAny.vip_table_selection as {
        selectedTable?: string;
        selectedTables?: string[];
        tablesRequired?: number;
        assignedVipTickets?: number;
      } | null) ?? undefined;

    if (!vipTableSelection) {
      const { data: vipReservations, error: vipResErr } = await supabase
        .from("vip_table_reservations")
        .select(
          `
            *,
            vip_tables ( * )
          `,
        )
        .eq("order_id", orderAny.id);

      if (vipResErr) {
        console.warn(
          "[GET /api/order/public] vip_table_reservations warning:",
          vipResErr,
        );
      } else if (vipReservations && vipReservations.length > 0) {
        const selectedTables = (vipReservations as any[])
          .map((r: any) => {
            const t = r.vip_tables;
            return (
              t?.label ||
              t?.name ||
              (typeof t?.table_number === "number"
                ? `Masa ${t.table_number}`
                : null) ||
              r.vip_table_id ||
              null
            );
          })
          .filter(Boolean);

        const assignedVipTickets = (vipReservations as any[]).reduce(
          (sum: number, r: any) =>
            sum +
            toNumber(
              r.seats_reserved ??
                r.seats_count ??
                r.reserved_seats ??
                r.qty ??
                r.quantity ??
                0,
            ),
          0,
        );

        vipTableSelection = {
          selectedTable: selectedTables[0] ?? undefined,
          selectedTables,
          tablesRequired: selectedTables.length || undefined,
          assignedVipTickets: assignedVipTickets || undefined,
        };
      }
    }

    // ---- Order-level money fallbacks (YOUR schema has *_ron fields)
    const orderLevelSubtotal = pickFirstNumber(orderAny, [
      "subtotal_ron",
      "subtotal",
      "sub_total",
      "amount_subtotal",
    ]);

    const orderLevelFees = pickFirstNumber(orderAny, [
      "fees_ron",
      "fees",
      "processing_fee",
    ]);

    const orderLevelDiscount = pickFirstNumber(orderAny, [
      "discount_ron",
      "discount",
      "discount_amount",
    ]);

    const orderLevelTotal = pickFirstNumber(orderAny, [
      "total_ron",
      "total",
      "total_amount",
      "amount_total",
      "grand_total",
    ]);

    // Prefer total for checkout total; subtotal only if total missing
    const orderLevelDisplayAmount =
      orderLevelTotal > 0
        ? orderLevelTotal
        : Math.max(orderLevelSubtotal + orderLevelFees - orderLevelDiscount, 0);

    // 5) Normalize response for checkout
    const normalizedItems = orderItems.map((item, index) => {
      const qty = Math.max(
        1,
        toNumber(
          item.qty ?? item.quantity ?? item.seats ?? item.tickets_count ?? 1,
        ),
      );

      // Try many possible unit/line price keys from multiple schemas
      const rawUnitPrice =
        item.unit_price ??
        item.price ??
        item.unitPrice ??
        item.price_per_unit ??
        item.unit_amount ??
        item.amount_per_unit ??
        item.price_ron ??
        item.unit_price_ron ??
        null;

      const rawTotalPrice =
        item.total_price ??
        item.line_total ??
        item.total ??
        item.lineTotal ??
        item.totalAmount ??
        item.total_amount ??
        item.subtotal ??
        item.amount ??
        item.final_price ??
        item.finalPrice ??
        item.gross_total ??
        item.total_ron ??
        item.line_total_ron ??
        item.subtotal_ron ??
        null;

      const unitPrice = toNumber(rawUnitPrice);
      const totalPrice = toNumber(rawTotalPrice);

      // Per-item fallback:
      // - if line total missing and only one item in order, use order total
      // - otherwise leave 0 for now, later we'll distribute at order level
      const finalTotalPrice =
        totalPrice > 0
          ? totalPrice
          : orderItems.length === 1 && orderLevelDisplayAmount > 0
            ? orderLevelDisplayAmount
            : 0;

      const finalUnitPrice =
        unitPrice > 0
          ? unitPrice
          : finalTotalPrice > 0
            ? finalTotalPrice / qty
            : 0;

      console.log("[GET /api/order/public] normalized item pricing", {
        id: item?.id,
        index,
        rawQty: {
          qty: item?.qty,
          quantity: item?.quantity,
          seats: item?.seats,
          tickets_count: item?.tickets_count,
        },
        rawUnitPrice,
        rawTotalPrice,
        parsed: {
          qty,
          unitPrice,
          totalPrice,
          finalUnitPrice,
          finalTotalPrice,
          orderLevelSubtotal,
          orderLevelTotal,
          orderLevelDisplayAmount,
        },
        rawPriceFields: {
          unit_price: item?.unit_price,
          price: item?.price,
          unitPrice: item?.unitPrice,
          price_per_unit: item?.price_per_unit,
          unit_amount: item?.unit_amount,
          total_price: item?.total_price,
          line_total: item?.line_total,
          total: item?.total,
          lineTotal: item?.lineTotal,
          totalAmount: item?.totalAmount,
          total_amount: item?.total_amount,
          subtotal: item?.subtotal,
          amount: item?.amount,
          final_price: item?.final_price,
          finalPrice: item?.finalPrice,
          total_ron: item?.total_ron,
          subtotal_ron: item?.subtotal_ron,
        },
      });

      const itemId = String(item.id ?? "");
      const itemDayCodes = itemId ? (daysByItemId.get(itemId) ?? []) : [];
      const canonical_day_set = canonicalDaySetFromCodes(itemDayCodes);

      const category =
        String(item.category ?? "general").toLowerCase() === "vip"
          ? "vip"
          : "general";

      const name =
        pickFirstString(item, [
          "name",
          "label",
          "product_name_snapshot",
          "ticket_name",
          "product_name",
          "title",
        ]) ?? `Bilet ${index + 1}`;

      return {
        id: itemId || `item-${index + 1}`,
        qty,
        quantity: qty,
        category,
        name,
        label: pickFirstString(item, ["label", "name"]) ?? name,
        unitPrice: finalUnitPrice,
        unit_price: finalUnitPrice,
        price: finalUnitPrice,
        totalPrice: finalTotalPrice,
        lineTotal: finalTotalPrice,
        line_total: finalTotalPrice,
        variantLabel:
          typeof item.variant_label === "string"
            ? item.variant_label
            : typeof item.variantLabel === "string"
              ? item.variantLabel
              : null,
        durationLabel:
          (typeof item.duration_label === "string"
            ? item.duration_label
            : undefined) ??
          (typeof item.durationLabel === "string"
            ? item.durationLabel
            : undefined) ??
          durationLabelFromCanonical(canonical_day_set),
        canonical_day_set,
      };
    });

    // 6) Force item-level prices from order totals when DB stores only order total
    // (your logs show this exact scenario)
    const allItemsMissingPrices =
      normalizedItems.length > 0 &&
      normalizedItems.every(
        (i) =>
          toNumber(i.totalPrice ?? i.lineTotal) <= 0 &&
          toNumber(i.unitPrice ?? i.price) <= 0,
      );

    if (allItemsMissingPrices && orderLevelDisplayAmount > 0) {
      const totalQty = normalizedItems.reduce(
        (sum, i) => sum + Math.max(1, toNumber(i.qty ?? i.quantity)),
        0,
      );

      if (normalizedItems.length === 1 || totalQty <= 0) {
        const first = normalizedItems[0];
        if (first) {
          const qty = Math.max(1, toNumber(first.qty ?? first.quantity));
          first.totalPrice = orderLevelDisplayAmount;
          first.lineTotal = orderLevelDisplayAmount;
          first.line_total = orderLevelDisplayAmount;
          first.unitPrice = orderLevelDisplayAmount / qty;
          first.unit_price = first.unitPrice;
          first.price = first.unitPrice;
        }
      } else {
        // Proportional by quantity (best possible when no per-item prices exist)
        let remaining = Math.round(orderLevelDisplayAmount * 100) / 100;
        let remainingQty = totalQty;

        normalizedItems.forEach((item, idx) => {
          const qty = Math.max(1, toNumber(item.qty ?? item.quantity));

          if (idx === normalizedItems.length - 1) {
            const line = Math.max(0, Math.round(remaining * 100) / 100);
            item.totalPrice = line;
            item.lineTotal = line;
            item.line_total = line;
            item.unitPrice = qty > 0 ? line / qty : line;
            item.unit_price = item.unitPrice;
            item.price = item.unitPrice;
            return;
          }

          const proportional =
            remainingQty > 0 ? (remaining * qty) / remainingQty : 0;
          const line = Math.max(0, Math.round(proportional * 100) / 100);

          item.totalPrice = line;
          item.lineTotal = line;
          item.line_total = line;
          item.unitPrice = qty > 0 ? line / qty : line;
          item.unit_price = item.unitPrice;
          item.price = item.unitPrice;

          remaining = Math.max(0, Math.round((remaining - line) * 100) / 100);
          remainingQty -= qty;
        });
      }

      console.log(
        "[GET /api/order/public] forced item price fallback from order totals",
        {
          orderLevelSubtotal,
          orderLevelFees,
          orderLevelDiscount,
          orderLevelTotal,
          orderLevelDisplayAmount,
          items: normalizedItems.map((i) => ({
            id: i.id,
            qty: i.qty,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        },
      );
    }

    console.log(
      "[GET /api/order/public] normalized items summary:",
      normalizedItems.map((i) => ({
        id: i.id,
        category: i.category,
        qty: i.qty,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        name: i.name,
      })),
    );

    const computedTotalItems = normalizedItems.reduce(
      (sum, item) => sum + toNumber(item.qty ?? item.quantity),
      0,
    );

    const computedItemsAmount = normalizedItems.reduce(
      (sum, item) => sum + toNumber(item.totalPrice ?? item.lineTotal),
      0,
    );

    const response = {
      order: {
        id: orderAny.id,
        publicToken: orderAny.public_token,
        status: orderAny.status ?? null,
        currency: orderAny.currency ?? "RON",

        hasVip:
          typeof orderAny.has_vip === "boolean"
            ? orderAny.has_vip
            : normalizedItems.some((i) => i.category === "vip"),

        totalItems:
          toNumber(orderAny.total_items) > 0
            ? toNumber(orderAny.total_items)
            : computedTotalItems,

        // Prefer item-sum if computed; else order total; else subtotal
        totalAmount:
          computedItemsAmount > 0
            ? Math.round(computedItemsAmount * 100) / 100
            : orderLevelDisplayAmount > 0
              ? Math.round(orderLevelDisplayAmount * 100) / 100
              : orderLevelSubtotal,

        items: normalizedItems,
        vipTableSelection: vipTableSelection ?? undefined,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/order/public] unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

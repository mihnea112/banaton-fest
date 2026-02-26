import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type DayCode = "FRI" | "SAT" | "SUN" | "MON";
type IncomingDayCode = "fri" | "sat" | "sun" | "mon" | DayCode;

type ProductCode =
  | "GENERAL_1_DAY"
  | "GENERAL_2_DAY"
  | "GENERAL_3_DAY"
  | "GENERAL_4_DAY"
  | "VIP_1_DAY"
  | "VIP_4_DAY";

type IncomingItem = {
  productCode: ProductCode;
  qty: number;
  selectedDayCodes?: IncomingDayCode[];
};

type IncomingBody = {
  items?: IncomingItem[];
};

type NormalizedLine = {
  productCode: ProductCode;
  category: "general" | "vip";
  name: string;
  durationLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  selectedDayCodes: DayCode[];
};

type TicketProductRow = Record<string, unknown> & {
  id: string;
};

type ResolvedLine = {
  line: NormalizedLine;
  ticketProductId: string;
  dbCategory?: string;
  dbDurationType?: string;
};

function productCodeToDurationKey(productCode: ProductCode):
  | "1_day"
  | "2_day"
  | "3_day"
  | "4_day" {
  if (productCode.endsWith("_1_DAY")) return "1_day";
  if (productCode.endsWith("_2_DAY")) return "2_day";
  if (productCode.endsWith("_3_DAY")) return "3_day";
  return "4_day";
}

function normalizeLoose(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function durationTypeMatches(productCode: ProductCode, dbValue: unknown): boolean {
  const key = productCodeToDurationKey(productCode);
  const v = normalizeLoose(dbValue);
  if (!v) return false;

  const aliases: Record<string, string[]> = {
    "1_day": ["1_day", "one_day", "single_day", "day_1", "oneday", "1day"],
    "2_day": ["2_day", "two_day", "day_2", "twoday", "2day"],
    "3_day": ["3_day", "three_day", "day_3", "threeday", "3day"],
    "4_day": ["4_day", "four_day", "full_festival", "festival", "day_4", "fourday", "4day"],
  };

  return aliases[key].includes(v);
}

function categoryMatches(line: NormalizedLine, dbValue: unknown): boolean {
  const v = normalizeLoose(dbValue);
  if (!v) return false;
  if (line.category === "vip") return ["vip"].includes(v);
  return ["general", "ga", "general_access"].includes(v);
}

function rowCodeMatches(productCode: ProductCode, row: Record<string, unknown>): boolean {
  const candidates = [
    row.product_code,
    row.code,
    row.slug,
    row.key,
    row.product_key,
    row.internal_code,
  ];
  const normalizedTarget = normalizeLoose(productCode);
  return candidates.some((c) => normalizeLoose(c) === normalizedTarget);
}

function resolveTicketProductForLine(
  line: NormalizedLine,
  rows: TicketProductRow[],
): { ok: true; value: ResolvedLine } | { ok: false; message: string } {
  // 1) Strong match by code if such column exists
  let match = rows.find((r) => rowCodeMatches(line.productCode, r));

  // 2) Fallback by category + duration_type enum/text
  if (!match) {
    const filtered = rows.filter(
      (r) => categoryMatches(line, r.category) && durationTypeMatches(line.productCode, r.duration_type),
    );
    if (filtered.length === 1) match = filtered[0];
    if (filtered.length > 1) {
      // Prefer exact snapshot/product name if available
      const byName = filtered.find(
        (r) => normalizeLoose(r.product_name_snapshot ?? r.name ?? r.label) === normalizeLoose(line.name),
      );
      match = byName ?? filtered[0];
    }
  }

  if (!match) {
    return {
      ok: false,
      message: `Nu am putut mapa produsul ${line.productCode} la ticket_products.id. Verifică tabelul ticket_products (code/product_code sau category + duration_type).`,
    };
  }

  return {
    ok: true,
    value: {
      line,
      ticketProductId: String(match.id),
      dbCategory: match.category != null ? String(match.category) : undefined,
      dbDurationType: match.duration_type != null ? String(match.duration_type) : undefined,
    },
  };
}

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

function normalizeDayCode(input: IncomingDayCode): DayCode | null {
  const v = String(input).trim().toUpperCase();
  if (v === "FRI") return "FRI";
  if (v === "SAT") return "SAT";
  if (v === "SUN") return "SUN";
  if (v === "MON") return "MON";
  return null;
}

function uniqueDayCodes(values: IncomingDayCode[] | undefined): DayCode[] {
  const out: DayCode[] = [];
  const seen = new Set<DayCode>();

  for (const raw of values || []) {
    const d = normalizeDayCode(raw);
    if (!d) continue;
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }

  return out;
}

function validateSelectedDays(
  productCode: ProductCode,
  selected: DayCode[],
): { valid: true; days: DayCode[] } | { valid: false; message: string } {
  switch (productCode) {
    case "GENERAL_1_DAY":
    case "VIP_1_DAY":
      if (selected.length !== 1) {
        return { valid: false, message: `${productCode} necesită exact 1 zi.` };
      }
      return { valid: true, days: selected };

    case "GENERAL_2_DAY": {
      if (selected.length !== 2) {
        return {
          valid: false,
          message: "GENERAL_2_DAY necesită exact 2 zile.",
        };
      }

      // Doar combinații permise: FRI+SUN, FRI+MON, SUN+MON (fără SAT)
      if (selected.includes("SAT")) {
        return {
          valid: false,
          message:
            "GENERAL_2_DAY nu permite Sâmbătă. Alege 2 zile dintre Vineri, Duminică, Luni.",
        };
      }

      return { valid: true, days: selected };
    }

    case "GENERAL_3_DAY": {
      const required: DayCode[] = ["FRI", "SUN", "MON"];
      if (selected.length !== 3) {
        return {
          valid: false,
          message: "GENERAL_3_DAY necesită exact 3 zile.",
        };
      }
      const same =
        required.every((d) => selected.includes(d)) &&
        selected.every((d) => required.includes(d));
      if (!same) {
        return {
          valid: false,
          message: "GENERAL_3_DAY trebuie să fie exact: FRI, SUN, MON.",
        };
      }
      return { valid: true, days: selected };
    }

    case "GENERAL_4_DAY":
    case "VIP_4_DAY": {
      const required: DayCode[] = ["FRI", "SAT", "SUN", "MON"];
      if (selected.length !== 4) {
        return {
          valid: false,
          message: `${productCode} necesită toate cele 4 zile.`,
        };
      }
      const same =
        required.every((d) => selected.includes(d)) &&
        selected.every((d) => required.includes(d));
      if (!same) {
        return {
          valid: false,
          message: `${productCode} trebuie să conțină: FRI, SAT, SUN, MON.`,
        };
      }
      return { valid: true, days: selected };
    }

    default:
      return { valid: false, message: "Produs necunoscut." };
  }
}

function computeLine(
  productCode: ProductCode,
  qty: number,
  days: DayCode[],
): NormalizedLine {
  const isVip = productCode.startsWith("VIP_");
  const category: "general" | "vip" = isVip ? "vip" : "general";

  let unitPrice = 0;
  let name = "";
  let durationLabel = "";

  switch (productCode) {
    case "GENERAL_1_DAY": {
      name = "Acces General - 1 zi";
      durationLabel = "1 zi";
      const d = days[0];
      unitPrice = d === "SAT" ? 80 : 50;
      break;
    }
    case "GENERAL_2_DAY":
      name = "Acces General - 2 zile";
      durationLabel = "2 zile";
      unitPrice = 60;
      break;
    case "GENERAL_3_DAY":
      name = "Acces General - 3 zile";
      durationLabel = "3 zile";
      unitPrice = 80;
      break;
    case "GENERAL_4_DAY":
      name = "Acces General - 4 zile";
      durationLabel = "4 zile";
      unitPrice = 120;
      break;
    case "VIP_1_DAY": {
      name = "Acces VIP - 1 zi";
      durationLabel = "1 zi";
      const d = days[0];
      unitPrice = d === "SAT" ? 350 : 200;
      break;
    }
    case "VIP_4_DAY":
      name = "Acces VIP - 4 zile";
      durationLabel = "4 zile";
      unitPrice = 750;
      break;
  }

  return {
    productCode,
    category,
    name,
    durationLabel,
    qty,
    unitPrice,
    lineTotal: unitPrice * qty,
    selectedDayCodes: days,
  };
}

async function fetchEventDays() {
  // Încercăm cu sort_order, apoi fallback pe day_index, apoi fără order
  const base = supabaseAdmin.from("event_days").select("*");

  let res = await base.order("sort_order", { ascending: true });
  if (res.error && String(res.error.message || "").includes("sort_order")) {
    console.warn(
      "[order-items] event_days.sort_order missing, retrying without order",
    );
    res = await supabaseAdmin
      .from("event_days")
      .select("*")
      .order("day_index", { ascending: true });
  }
  if (res.error && String(res.error.message || "").includes("day_index")) {
    res = await supabaseAdmin.from("event_days").select("*");
  }

  return res;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ publicToken: string }> },
) {
  const { publicToken } = await context.params;

  try {
    console.log("[order-items] upsert start", {
      publicToken,
      method: "PUT",
      url: req.url,
    });

    const rawBody = (await req.json().catch(() => ({}))) as IncomingBody;
    console.log("[order-items] raw body", rawBody);

    const incomingItems = Array.isArray(rawBody.items) ? rawBody.items : [];
    if (incomingItems.length === 0) {
      return jsonError("Trebuie trimis cel puțin un item.", 400);
    }

    // Validare minimă payload
    for (const item of incomingItems) {
      if (!item || typeof item !== "object") {
        return jsonError("Format item invalid.", 400);
      }
      if (!item.productCode) {
        return jsonError("Lipsește productCode.", 400);
      }
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        return jsonError(`Cantitate invalidă pentru ${item.productCode}.`, 400);
      }
    }

    console.log("[order-items] parsed incoming items", incomingItems);

    // 1) Găsim comanda după public_token
    const orderRes = await supabaseAdmin
      .from("orders")
      .select("id, public_token, status")
      .eq("public_token", publicToken)
      .maybeSingle();

    console.log("[order-items] order lookup result", {
      found: !!orderRes.data,
      orderId: orderRes.data?.id,
      status: orderRes.data?.status,
      orderError: orderRes.error ?? null,
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

    if (orderRes.data.status && String(orderRes.data.status) !== "draft") {
      return jsonError("Comanda nu mai poate fi modificată.", 409);
    }

    const orderId = orderRes.data.id;

    // 2) Citim zilele (pentru mapare day_code -> id)
    const { data: eventDays, error: daysError } = await fetchEventDays();

    console.log("[order-items] event days", eventDays ?? null);
    if (daysError) {
      console.error("[order-items] daysError", daysError);
      return jsonError("Eroare la citirea zilelor evenimentului.", 500, {
        details: daysError.message,
        code: daysError.code,
      });
    }

    const dayCodeToId = new Map<DayCode, string>();
    for (const row of eventDays || []) {
      const code = normalizeDayCode(
        (row as Record<string, unknown>).day_code as IncomingDayCode,
      );
      if (!code) continue;
      const id = String((row as Record<string, unknown>).id ?? "");
      if (id) dayCodeToId.set(code, id);
    }

    console.log("[order-items] dayCodeToId keys", [...dayCodeToId.keys()]);

    // 3) Normalizare + validare + pricing
    const normalizedLines: NormalizedLine[] = [];

    for (const item of incomingItems) {
      const normalizedInputDays = uniqueDayCodes(item.selectedDayCodes);
      console.log("[order-items] validating item", {
        productCode: item.productCode,
        qty: item.qty,
        selectedDayCodes: item.selectedDayCodes,
      });

      const validation = validateSelectedDays(
        item.productCode,
        normalizedInputDays,
      );

      console.log("[order-items] validation result", {
        productCode: item.productCode,
        inputDays: item.selectedDayCodes,
        normalizedInputDays,
        validation,
      });

      if (!validation.valid) {
        return jsonError(validation.message, 400);
      }

      // verificăm că există zilele în DB
      for (const d of validation.days) {
        if (!dayCodeToId.has(d)) {
          return jsonError(`Ziua ${d} nu există în event_days.`, 500);
        }
      }

      const line = computeLine(item.productCode, item.qty, validation.days);

      console.log("[order-items] computed price", {
        productCode: line.productCode,
        selectedDayCodes: line.selectedDayCodes,
        qty: line.qty,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      });

      normalizedLines.push(line);
    }

    console.log("[order-items] normalized lines", normalizedLines);

    // 3.1) Mapăm fiecare line la ticket_products.id (obligatoriu în schema ta)
    const ticketProductsRes = await supabaseAdmin
      .from("ticket_products")
      .select("*");

    if (ticketProductsRes.error) {
      return jsonError("Eroare la citirea ticket_products.", 500, {
        details: ticketProductsRes.error.message,
        code: ticketProductsRes.error.code,
      });
    }

    const ticketProductRows = (ticketProductsRes.data || []) as TicketProductRow[];
    console.log("[order-items] ticket_products rows", ticketProductRows);

    const resolvedLines: ResolvedLine[] = [];
    for (const line of normalizedLines) {
      const resolved = resolveTicketProductForLine(line, ticketProductRows);
      if (!resolved.ok) {
        return jsonError(resolved.message, 500, {
          productCode: line.productCode,
          availableTicketProducts: ticketProductRows.map((r) => ({
            id: r.id,
            category: r.category,
            duration_type: r.duration_type,
            code: (r as Record<string, unknown>).code,
            product_code: (r as Record<string, unknown>).product_code,
            name: (r as Record<string, unknown>).name,
          })),
        });
      }
      resolvedLines.push(resolved.value);
    }

    console.log(
      "[order-items] resolved lines -> ticket_products",
      resolvedLines.map((x) => ({
        productCode: x.line.productCode,
        ticketProductId: x.ticketProductId,
        dbCategory: x.dbCategory,
        dbDurationType: x.dbDurationType,
      })),
    );

    // 4) Ștergem itemele existente + day links + VIP allocations (dacă există)
    // găsim itemele existente pentru a curăța order_item_days
    const existingItemsRes = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("order_id", orderId);

    if (existingItemsRes.error) {
      return jsonError("Eroare la citirea itemelor existente.", 500, {
        details: existingItemsRes.error.message,
        code: existingItemsRes.error.code,
      });
    }

    const existingItemIds = (existingItemsRes.data || []).map((x) =>
      String(x.id),
    );
    console.log("[order-items] existing item ids", existingItemIds);

    if (existingItemIds.length > 0) {
      // order_item_days (fallback dacă coloana e order_item_id / item_id etc. - presupunem order_item_id)
      const delDaysRes = await supabaseAdmin
        .from("order_item_days")
        .delete()
        .in("order_item_id", existingItemIds);

      if (delDaysRes.error) {
        console.warn(
          "[order-items] order_item_days delete warning",
          delDaysRes.error,
        );
      }
    }

    // Curățăm eventuale rezervări VIP pentru că structura biletelor s-a schimbat
    console.log("[order-items] clearing vip reservations for order", orderId);

    // 1) Find reservation ids for this order
    const existingVipRes = await supabaseAdmin
      .from("vip_table_reservations")
      .select("id")
      .eq("order_id", orderId);

    if (existingVipRes.error) {
      console.warn(
        "[order-items] vip_table_reservations select warning",
        existingVipRes.error,
      );
    }

    const vipReservationIds = (existingVipRes.data || []).map((r) => String(r.id));

    // 2) Delete reservation days (child table) by vip_table_reservation_id
    if (vipReservationIds.length > 0) {
      const delVipDays = await supabaseAdmin
        .from("vip_table_reservation_days")
        .delete()
        .in("vip_table_reservation_id", vipReservationIds);

      if (delVipDays.error) {
        console.warn(
          "[order-items] vip_table_reservation_days delete warning",
          delVipDays.error,
        );
      }
    }

    // 3) Delete reservations (parent table)
    const delVipRes = await supabaseAdmin
      .from("vip_table_reservations")
      .delete()
      .eq("order_id", orderId);

    if (delVipRes.error) {
      console.warn(
        "[order-items] vip_table_reservations delete warning",
        delVipRes.error,
      );
    }

    const deleteItemsRes = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsRes.error) {
      return jsonError("Eroare la ștergerea itemelor vechi.", 500, {
        details: deleteItemsRes.error.message,
        code: deleteItemsRes.error.code,
      });
    }

    // 5) Inserăm order_items cu fallback pe coloane lipsă (aliniat la schema reală)
    let includeCategory = true;
    let includeDurationType = true;
    let includeVariantLabelSnapshot = true;
    let includeUnitPriceRon = true;
    let includeLineTotalRon = true;
    let includeCanonicalDaySet = true;

    const buildOrderItemsRows = () => {
      return resolvedLines.map((resolved) => {
        const { line } = resolved;
        const row: Record<string, unknown> = {
          order_id: orderId,
          ticket_product_id: resolved.ticketProductId,
          quantity: line.qty,
        };

        if (includeCategory) row.category = resolved.dbCategory ?? line.category;
        if (includeDurationType && resolved.dbDurationType) {
          // folosim exact valoarea din DB (enum-safe)
          row.duration_type = resolved.dbDurationType;
        }
        row.product_name_snapshot = line.name;
        if (includeVariantLabelSnapshot)
          row.variant_label_snapshot = line.durationLabel;
        if (includeUnitPriceRon) row.unit_price_ron = line.unitPrice;
        if (includeLineTotalRon) row.line_total_ron = line.lineTotal;
        if (includeCanonicalDaySet)
          row.canonical_day_set = line.selectedDayCodes.join(",");

        return row;
      });
    };

    let insertedItems: Array<{ id: string }> | null = null;

    for (let attempt = 1; attempt <= 8; attempt++) {
      const rows = buildOrderItemsRows();

      console.log("[order-items] insert attempt", {
        attempt,
        includeCategory,
        includeDurationType,
        includeVariantLabelSnapshot,
        includeUnitPriceRon,
        includeLineTotalRon,
        includeCanonicalDaySet,
        rows,
      });

      const insertRes = await supabaseAdmin
        .from("order_items")
        .insert(rows)
        .select("id");

      if (!insertRes.error) {
        insertedItems = (insertRes.data || []).map((r) => ({
          id: String(r.id),
        }));
        break;
      }

      const msg = String(insertRes.error.message || "");
      console.error("[order-items] insertItemsError", insertRes.error);

      if (msg.includes("variant_label_snapshot")) {
        console.warn(
          "[order-items] order_items.variant_label_snapshot missing, retrying without column",
        );
        includeVariantLabelSnapshot = false;
        continue;
      }

      if (msg.includes("unit_price_ron")) {
        console.warn(
          "[order-items] order_items.unit_price_ron missing, retrying without column",
        );
        includeUnitPriceRon = false;
        continue;
      }

      if (msg.includes("line_total_ron")) {
        console.warn(
          "[order-items] order_items.line_total_ron missing, retrying without column",
        );
        includeLineTotalRon = false;
        continue;
      }

      if (msg.includes("canonical_day_set")) {
        console.warn(
          "[order-items] order_items.canonical_day_set missing, retrying without column",
        );
        includeCanonicalDaySet = false;
        continue;
      }

      if (msg.includes("duration_type")) {
        console.warn(
          "[order-items] order_items.duration_type missing or incompatible, retrying without column",
        );
        includeDurationType = false;
        continue;
      }

      if (msg.includes("category")) {
        console.warn(
          "[order-items] order_items.category missing or incompatible, retrying without column",
        );
        includeCategory = false;
        continue;
      }

      if (msg.includes("ticket_product_id")) {
        return jsonError("Schema order_items cere ticket_product_id, dar maparea către ticket_products a eșuat.", 500, {
          details: insertRes.error.message,
          code: insertRes.error.code,
        });
      }
      return jsonError("Eroare la inserarea itemelor.", 500, {
        details: insertRes.error.message,
        code: insertRes.error.code,
      });
    }

    if (!insertedItems || insertedItems.length !== normalizedLines.length) {
      return jsonError("Nu s-au putut insera toate itemele.", 500);
    }

    // 6) Inserăm order_item_days (dacă tabela/coloanele există)
    const dayLinkRows: Array<Record<string, unknown>> = [];
    insertedItems.forEach((inserted, index) => {
      const line = normalizedLines[index];
      for (const dayCode of line.selectedDayCodes) {
        const eventDayId = dayCodeToId.get(dayCode);
        if (!eventDayId) continue;
        dayLinkRows.push({
          order_item_id: inserted.id,
          event_day_id: eventDayId,
        });
      }
    });

    if (dayLinkRows.length > 0) {
      const linkRes = await supabaseAdmin
        .from("order_item_days")
        .insert(dayLinkRows);

      if (linkRes.error) {
        // Nu blocăm flow-ul complet dacă schema diferă, dar logăm
        console.warn(
          "[order-items] order_item_days insert warning",
          linkRes.error,
        );
      }
    }

    // 7) Actualizăm totalul în orders (cu fallback dacă coloanele lipsesc)
    const totalAmount = normalizedLines.reduce((s, x) => s + x.lineTotal, 0);
    const totalItems = normalizedLines.reduce((s, x) => s + x.qty, 0);

    const updateCandidates: Record<string, unknown>[] = [
      // most likely in your schema
      { total_ron: totalAmount, total_items: totalItems },
      { total_ron: totalAmount },
      { subtotal_ron: totalAmount, total_items: totalItems },
      { subtotal_ron: totalAmount },

      // fallbacks for older schema variants
      { total_amount: totalAmount, total_items: totalItems },
      { total_amount: totalAmount },
      { total: totalAmount, total_items: totalItems },
      { total: totalAmount },
    ];

    for (const patch of updateCandidates) {
      const updRes = await supabaseAdmin
        .from("orders")
        .update(patch)
        .eq("id", orderId);
      if (!updRes.error) break;
      console.warn("[order-items] orders total update warning", {
        patch,
        error: updRes.error,
      });
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: orderId,
        publicToken,
        status: "draft",
        totalItems,
        totalAmount,
      },
      items: normalizedLines.map((x) => ({
        productCode: x.productCode,
        category: x.category,
        qty: x.qty,
        unitPrice: x.unitPrice,
        lineTotal: x.lineTotal,
        selectedDayCodes: x.selectedDayCodes,
      })),
    });
  } catch (error) {
    console.error("[order-items] unexpected error", error);
    return jsonError("Eroare internă la salvarea biletelor.", 500);
  }
}

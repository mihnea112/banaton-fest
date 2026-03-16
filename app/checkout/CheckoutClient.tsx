"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Lang = "ro" | "en";

interface DraftOrderItem {
  id: string;
  qty?: number;
  quantity?: number; // legacy fallback

  category: "general" | "vip";

  name?: string;
  label?: string; // legacy fallback

  price?: number; // legacy / pre-normalized
  unitPrice?: number;
  unit_price?: number;

  totalPrice?: number;
  lineTotal?: number;
  line_total?: number;

  variantLabel?: string | null;
  durationLabel?: string;

  canonical_day_set?: string; // optional dacă vine în draft
}

interface DraftOrder {
  hasVip?: boolean;
  totalItems: number;
  totalAmount: number;
  currency?: string;
  publicToken?: string;
  status?: string | null;
  paymentStatus?: string | null;

  customerEmail?: string;
  customerPhone?: string;
  billingCity?: string;
  billingCounty?: string;
  billingAddress?: string;

  items: DraftOrderItem[];
  rawCart?: Record<string, number>;

  vipTableSelection?: {
    selectedTable?: string;
    selectedTables?: string[];
    tablesRequired?: number;
    assignedVipTickets?: number;
  };
}

type VipAllocationDraft = {
  tableId?: string;
  tableLabel?: string;
  dayCodes?: string[]; // ["FRI","SAT",...]
  seats?: number;
};

const PUBLIC_TOKEN_STORAGE_KEY = "banatonFestPublicToken";
// (optional fallback only)
const VIP_ALLOCATIONS_STORAGE_KEY = "banatonFestVipAllocations";

function displayCategoryLabel(category: DraftOrderItem["category"]) {
  // IMPORTANT: "general" is named "Fan Pit" across the site.
  return category === "vip" ? "VIP" : "Fan Pit";
}

function normalizeTicketTitle(title: string) {
  // Defensive: old API / seed data might still include these labels
  return String(title || "")
    .replace(/Acces\s+General/gi, "Fan Pit")
    .replace(/General\s+Access/gi, "Fan Pit")
    .trim();
}

function formatMoney(value: number, lang: Lang, currency: string | undefined) {
  const safe = Number.isFinite(value) ? value : 0;
  const locale = lang === "en" ? "en-US" : "ro-RO";
  const cur = (currency || "RON").toUpperCase();

  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);

  // Display number + lei (RO) / RON (EN)
  const unit = cur === "RON" ? (lang === "en" ? "RON" : "lei") : cur;
  return `${amount} ${unit}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").replace(/[^0-9.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDayCodeLabel(day: string, lang: Lang) {
  const d = String(day || "")
    .trim()
    .toUpperCase();

  if (d === "FRI") return lang === "en" ? "Friday" : "Vineri";
  if (d === "SAT") return lang === "en" ? "Saturday" : "Sâmbătă";
  if (d === "SUN") return lang === "en" ? "Sunday" : "Duminică";
  if (d === "MON") return lang === "en" ? "Monday" : "Luni";

  return lang === "en" ? "Unknown day" : "Zi necunoscută";
}

function parseCanonicalDaySet(value: unknown): string[] {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!raw) return [];

  return Array.from(new Set(raw.split(/[^A-Z]+/).filter(Boolean))).filter((d) =>
    ["FRI", "SAT", "SUN", "MON"].includes(d),
  );
}

function normalizeVipAllocations(input: unknown): VipAllocationDraft[] {
  if (!Array.isArray(input)) return [];

  const out: VipAllocationDraft[] = [];

  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;

    const seats = toNumber(r.seats ?? r.qty ?? r.quantity);
    const tableLabel =
      typeof r.tableLabel === "string" && r.tableLabel.trim()
        ? r.tableLabel.trim()
        : typeof r.table_label === "string" && r.table_label.trim()
          ? r.table_label.trim()
          : typeof r.table_id === "string"
            ? r.table_id
            : typeof r.tableId === "string"
              ? r.tableId
              : typeof r.table === "string"
                ? r.table
                : undefined;

    const dayCodesRaw = Array.isArray(r.dayCodes)
      ? r.dayCodes
      : Array.isArray(r.day_codes)
        ? r.day_codes
        : Array.isArray(r.days)
          ? r.days
          : [];

    const dayCodes = Array.from(
      new Set(
        dayCodesRaw
          .map((d) =>
            String(d || "")
              .trim()
              .toUpperCase(),
          )
          .filter((d) => ["FRI", "SAT", "SUN", "MON"].includes(d)),
      ),
    );

    if (!tableLabel) continue;
    if (!Number.isInteger(seats) || seats <= 0) continue;
    if (dayCodes.length === 0) continue;

    out.push({
      tableLabel,
      dayCodes,
      seats,
      tableId: typeof r.tableId === "string" ? r.tableId : undefined,
    });
  }

  return out;
}

function extractOrderFromApi(payload: unknown): DraftOrder | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;

  const candidate =
    (root.order as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined) ??
    root;

  if (!candidate || typeof candidate !== "object") return null;

  const itemsRaw = Array.isArray(candidate.items)
    ? candidate.items
    : Array.isArray((candidate as Record<string, unknown>).order_items)
      ? ((candidate as Record<string, unknown>).order_items as unknown[])
      : null;

  if (!itemsRaw) return null;

  const normalizedItems = itemsRaw.reduce<DraftOrderItem[]>(
    (acc, raw, index) => {
      if (!raw || typeof raw !== "object") return acc;

      const r = raw as Record<string, unknown>;

      const categoryValue = String(
        r.category ?? r.ticket_category ?? r.access_type ?? "general",
      ).toLowerCase();

      const category: "general" | "vip" =
        categoryValue === "vip" ? "vip" : "general";

      const qty = toNumber(r.qty ?? r.quantity ?? r.count ?? r.seats ?? 1);

      const pricing =
        r.pricing && typeof r.pricing === "object"
          ? (r.pricing as Record<string, unknown>)
          : null;

      const directPrice = toNumber(
        r.price ??
          r.ticket_price ??
          r.product_price ??
          r.amount ??
          r.amount_per_unit ??
          r.unit_amount ??
          pricing?.price ??
          pricing?.unitPrice ??
          pricing?.unit_price,
      );

      const unitPrice = toNumber(
        r.unitPrice ??
          r.unit_price ??
          r.price_per_unit ??
          r.unit_amount ??
          r.unit_total ??
          r.price_ron ??
          r.unit_price_ron ??
          pricing?.unitPrice ??
          pricing?.unit_price ??
          pricing?.unit_amount ??
          pricing?.price,
      );

      const lineTotal = toNumber(
        r.totalPrice ??
          r.lineTotal ??
          r.line_total ??
          r.total ??
          r.itemTotal ??
          r.total_amount ??
          r.amount_total ??
          r.amount ??
          r.subtotal ??
          r.final_total ??
          r.final_price ??
          r.gross_total ??
          r.total_ron ??
          r.line_total_ron ??
          r.subtotal_ron ??
          pricing?.totalPrice ??
          pricing?.lineTotal ??
          pricing?.line_total ??
          pricing?.total ??
          pricing?.amount,
      );

      const finalUnitPrice =
        unitPrice > 0
          ? unitPrice
          : directPrice > 0
            ? directPrice
            : qty > 0 && lineTotal > 0
              ? lineTotal / qty
              : 0;

      const finalLineTotal = lineTotal > 0 ? lineTotal : qty * finalUnitPrice;

      const name =
        (typeof r.name === "string" && r.name) ||
        (typeof r.label === "string" && r.label) ||
        (typeof r.ticket_name === "string" && r.ticket_name) ||
        (typeof r.product_name === "string" && r.product_name) ||
        (typeof r.product_name_snapshot === "string" &&
          r.product_name_snapshot) ||
        (typeof r.title === "string" && r.title) ||
        "Bilet";

      acc.push({
        id:
          (typeof r.id === "string" && r.id) ||
          (typeof r.order_item_id === "string" && r.order_item_id) ||
          `item-${index}`,
        qty,
        quantity: qty,
        category,
        name,
        label:
          (typeof r.label === "string" && r.label) ||
          (typeof r.name === "string" && r.name) ||
          name,
        price: finalUnitPrice,
        unitPrice: finalUnitPrice,
        totalPrice: finalLineTotal,
        lineTotal: finalLineTotal,
        variantLabel:
          typeof r.variantLabel === "string"
            ? r.variantLabel
            : typeof r.variant_label === "string"
              ? r.variant_label
              : null,
        durationLabel:
          typeof r.durationLabel === "string"
            ? r.durationLabel
            : typeof r.duration_label === "string"
              ? r.duration_label
              : undefined,
        canonical_day_set:
          typeof r.canonical_day_set === "string"
            ? r.canonical_day_set
            : undefined,
      });

      return acc;
    },
    [],
  );

  const totalAmount =
    toNumber(candidate.totalAmount) ||
    toNumber(candidate.total_amount) ||
    toNumber(candidate.total_ron) ||
    toNumber(candidate.amount_total) ||
    toNumber(candidate.amount) ||
    toNumber(candidate.subtotal_ron) ||
    toNumber(candidate.subtotal) ||
    toNumber(candidate.final_total) ||
    toNumber(candidate.final_price) ||
    toNumber(candidate.gross_total) ||
    normalizedItems.reduce(
      (sum, item) => sum + toNumber(item.totalPrice ?? item.lineTotal),
      0,
    );

  const totalItems =
    toNumber(candidate.totalItems) ||
    toNumber(candidate.total_items) ||
    normalizedItems.reduce(
      (sum, item) => sum + toNumber(item.qty ?? item.quantity),
      0,
    );

  const hasVip =
    typeof candidate.hasVip === "boolean"
      ? candidate.hasVip
      : normalizedItems.some((i) => i.category === "vip");

  const vipTableSelection =
    candidate.vipTableSelection &&
    typeof candidate.vipTableSelection === "object"
      ? (candidate.vipTableSelection as DraftOrder["vipTableSelection"])
      : undefined;

  return {
    hasVip,
    totalItems,
    totalAmount,
    currency:
      (typeof candidate.currency === "string" && candidate.currency) || "RON",
    publicToken:
      (typeof candidate.publicToken === "string" && candidate.publicToken) ||
      (typeof candidate.public_token === "string" && candidate.public_token) ||
      undefined,
    status: typeof candidate.status === "string" ? candidate.status : null,
    paymentStatus:
      (typeof (candidate as any).paymentStatus === "string" &&
        (candidate as any).paymentStatus) ||
      (typeof (candidate as any).payment_status === "string" &&
        (candidate as any).payment_status) ||
      null,

    customerEmail:
      (typeof candidate.customerEmail === "string" &&
        candidate.customerEmail) ||
      (typeof (candidate as any).customer_email === "string" &&
        (candidate as any).customer_email) ||
      undefined,
    customerPhone:
      (typeof candidate.customerPhone === "string" &&
        candidate.customerPhone) ||
      (typeof (candidate as any).customer_phone === "string" &&
        (candidate as any).customer_phone) ||
      undefined,
    billingCity:
      (typeof (candidate as any).billingCity === "string" &&
        (candidate as any).billingCity) ||
      (typeof (candidate as any).billing_city === "string" &&
        (candidate as any).billing_city) ||
      undefined,
    billingCounty:
      (typeof (candidate as any).billingCounty === "string" &&
        (candidate as any).billingCounty) ||
      (typeof (candidate as any).billing_county === "string" &&
        (candidate as any).billing_county) ||
      undefined,
    billingAddress:
      (typeof (candidate as any).billingAddress === "string" &&
        (candidate as any).billingAddress) ||
      (typeof (candidate as any).billing_address === "string" &&
        (candidate as any).billing_address) ||
      undefined,

    items: normalizedItems,
    vipTableSelection,
  };
}

async function fetchOrderByToken(
  orderToken: string,
): Promise<DraftOrder | null> {
  const res = await fetch(
    `/api/order/public?token=${encodeURIComponent(orderToken)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) throw new Error(`Order fetch failed: ${res.status}`);

  const payload = (await res.json()) as unknown;
  return extractOrderFromApi(payload);
}

/**
 * ✅ Source of truth for VIP allocation: API (not sessionStorage)
 */
async function fetchVipAllocationsFromApi(
  orderToken: string,
): Promise<VipAllocationDraft[]> {
  // 1) /api/order/{token}
  try {
    const res = await fetch(`/api/order/${encodeURIComponent(orderToken)}`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (res.ok) {
      const candidate =
        (json.data as Record<string, unknown> | undefined) ??
        (json.order as Record<string, unknown> | undefined) ??
        json;

      const raw =
        (candidate as any).vipAllocations ??
        (candidate as any).vip_allocations ??
        (candidate as any).allocations ??
        (candidate as any).vip_table_allocations ??
        (candidate as any).vip_table_reservations ??
        null;

      const normalized = normalizeVipAllocations(raw);
      if (normalized.length) return normalized;
    }
  } catch {
    // ignore
  }

  // 2) /api/order/{token}/vip-allocation
  try {
    const res = await fetch(
      `/api/order/${encodeURIComponent(orderToken)}/vip-allocation`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    const json = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (res.ok) {
      const raw =
        (json as any).allocations ??
        (json as any).data?.allocations ??
        (json as any).vipAllocations ??
        (json as any).vip_allocations ??
        null;

      const normalized = normalizeVipAllocations(raw);
      if (normalized.length) return normalized;
    }
  } catch {
    // ignore
  }

  // 3) optional fallback
  try {
    const rawVipAlloc = window.sessionStorage.getItem(
      VIP_ALLOCATIONS_STORAGE_KEY,
    );
    if (rawVipAlloc) {
      const parsed = JSON.parse(rawVipAlloc);
      return normalizeVipAllocations(parsed);
    }
  } catch {
    // ignore
  }

  return [];
}

export default function CheckoutClient({ lang = "ro" }: { lang?: Lang }) {
  const isEn = lang === "en";
  const tr = (ro: string, en: string) => (isEn ? en : ro);

  const searchParams = useSearchParams();
  const queryToken = searchParams?.get("order") ?? null;

  const [orderDraft, setOrderDraft] = useState<DraftOrder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedVipTable, setSelectedVipTable] = useState<string | null>(null);
  const [vipAllocations, setVipAllocations] = useState<VipAllocationDraft[]>(
    [],
  );

  const [publicOrderToken, setPublicOrderToken] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [billingEmail, setBillingEmail] = useState("");
  const [billingEmailConfirm, setBillingEmailConfirm] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  const isPaid = (orderDraft?.status || "").toLowerCase() === "paid";
  const isPending =
    (orderDraft?.status || "").toLowerCase().includes("pending") ||
    (orderDraft?.paymentStatus || "").toLowerCase() === "pending";

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutData() {
      setIsLoaded(false);
      setCheckoutError(null);

      try {
        let resolvedToken = queryToken;

        if (!resolvedToken) {
          try {
            resolvedToken = window.sessionStorage.getItem(
              PUBLIC_TOKEN_STORAGE_KEY,
            );
          } catch {
            // ignore
          }
        }

        if (resolvedToken) {
          try {
            window.sessionStorage.setItem(
              PUBLIC_TOKEN_STORAGE_KEY,
              resolvedToken,
            );
          } catch {
            // ignore
          }
        }

        if (!cancelled) setPublicOrderToken(resolvedToken || null);

        if (!resolvedToken) {
          if (!cancelled) {
            setOrderDraft(null);
            setSelectedVipTable(null);
            setVipAllocations([]);
          }
          return;
        }

        const apiOrder = await fetchOrderByToken(resolvedToken);
        const apiVipAllocations =
          await fetchVipAllocationsFromApi(resolvedToken);

        if (!cancelled) {
          setOrderDraft(apiOrder);

          setSelectedVipTable(
            apiOrder?.vipTableSelection?.selectedTable ??
              apiOrder?.vipTableSelection?.selectedTables?.[0] ??
              null,
          );

          setVipAllocations(apiVipAllocations);

          if (apiOrder?.publicToken) setPublicOrderToken(apiOrder.publicToken);

          if (apiOrder) {
            setBillingEmail(apiOrder.customerEmail ?? "");
            setBillingPhone(apiOrder.customerPhone ?? "");
          }
        }
      } catch (err) {
        console.error("[checkout] Failed to load checkout data:", err);

        if (!cancelled) {
          setOrderDraft(null);
          setSelectedVipTable(null);
          setVipAllocations([]);
          setPublicOrderToken(null);
          setCheckoutError(
            tr(
              "Nu am putut încărca datele comenzii.",
              "Could not load order data.",
            ),
          );
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    void loadCheckoutData();
    return () => {
      cancelled = true;
    };
  }, [queryToken]);

  useEffect(() => {
    if (!publicOrderToken) return;
    if (!orderDraft) return;

    const status = String(orderDraft.status || "").toLowerCase();
    if (status === "paid") return;

    if (!status || status.includes("draft") || status.includes("created"))
      return;

    let stop = false;
    const id = window.setInterval(async () => {
      if (stop) return;
      try {
        const next = await fetchOrderByToken(publicOrderToken);
        if (next) setOrderDraft(next);
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [publicOrderToken, orderDraft]);

  const subtotal = useMemo(() => {
    if (!orderDraft) return 0;

    const draftTotal = toNumber(orderDraft.totalAmount);
    if (draftTotal > 0) return draftTotal;

    return (orderDraft.items || []).reduce((sum, item) => {
      const qty = toNumber(item.qty ?? item.quantity);
      const line = toNumber(item.totalPrice ?? item.lineTotal);
      if (line > 0) return sum + line;

      const unit = toNumber(item.unitPrice ?? item.price);
      return sum + qty * unit;
    }, 0);
  }, [orderDraft]);

  const vipItemsCount = useMemo(() => {
    if (!orderDraft) return 0;
    return (orderDraft.items || [])
      .filter((item) => item.category === "vip")
      .reduce((sum, item) => sum + toNumber(item.qty ?? item.quantity), 0);
  }, [orderDraft]);

  const requiredVipSeatsByDay = useMemo(() => {
    const map = new Map<string, number>();
    if (!orderDraft) return map;

    for (const item of orderDraft.items || []) {
      if (item.category !== "vip") continue;

      const qty = toNumber(item.qty ?? item.quantity);
      if (qty <= 0) continue;

      const days = parseCanonicalDaySet(
        item.canonical_day_set ?? item.durationLabel ?? "",
      );
      if (days.length === 0) continue;

      for (const d of days) map.set(d, (map.get(d) || 0) + qty);
    }

    return map;
  }, [orderDraft]);

  const allocatedVipSeatsByDay = useMemo(() => {
    const map = new Map<string, number>();

    for (const a of vipAllocations) {
      const seats = toNumber(a.seats);
      if (seats <= 0) continue;

      for (const d of a.dayCodes || []) {
        const key = String(d).toUpperCase();
        map.set(key, (map.get(key) || 0) + seats);
      }
    }

    return map;
  }, [vipAllocations]);

  const hasVipItems = vipItemsCount > 0;
  const requiresVipTable = hasVipItems;

  const hasLegacyVipSelection = !!selectedVipTable;
  const hasNewVipAllocations = vipAllocations.length > 0;

  const isVipAllocationComplete = useMemo(() => {
    if (!requiresVipTable) return true;

    if (hasNewVipAllocations) {
      const totalAllocated = vipAllocations.reduce(
        (sum, a) => sum + toNumber(a.seats),
        0,
      );

      if (requiredVipSeatsByDay.size === 0)
        return totalAllocated === vipItemsCount;

      const allDays = new Set<string>([
        ...requiredVipSeatsByDay.keys(),
        ...allocatedVipSeatsByDay.keys(),
      ]);

      for (const day of allDays) {
        const required = requiredVipSeatsByDay.get(day) || 0;
        const allocated = allocatedVipSeatsByDay.get(day) || 0;
        if (required !== allocated) return false;
      }

      return true;
    }

    return hasLegacyVipSelection;
  }, [
    requiresVipTable,
    hasNewVipAllocations,
    vipAllocations,
    vipItemsCount,
    hasLegacyVipSelection,
    requiredVipSeatsByDay,
    allocatedVipSeatsByDay,
  ]);

  const safeDisplayTotal = Number.isFinite(subtotal) ? subtotal : 0;

  const payLabel = orderDraft
    ? tr(
        `Plătește ${formatMoney(safeDisplayTotal, lang, orderDraft?.currency)}`,
        `Pay ${formatMoney(safeDisplayTotal, lang, orderDraft?.currency)}`,
      )
    : tr("Plătește", "Pay");

  const isBillingFormComplete = useMemo(() => {
    const email = billingEmail.trim();
    const emailConfirm = billingEmailConfirm.trim();
    const phone = billingPhone.trim();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const emailsMatch = email === emailConfirm;

    return emailLooksValid && emailsMatch && phone.length > 0;
  }, [billingEmail, billingEmailConfirm, billingPhone]);

  const canProceedToPayment =
    !!orderDraft &&
    orderDraft.items.length > 0 &&
    isVipAllocationComplete &&
    isBillingFormComplete &&
    !isPaid;

  const vipSelectionHref = publicOrderToken
    ? `/vip?order=${encodeURIComponent(publicOrderToken)}`
    : "/vip";

  const vipAllocationSummary = useMemo(() => {
    if (!hasVipItems) return [];

    if (vipAllocations.length > 0) {
      return vipAllocations.map((a, idx) => {
        const days = (a.dayCodes || [])
          .map((d) => normalizeDayCodeLabel(d, lang))
          .join(", ");
        return {
          key: `${a.tableLabel || a.tableId || "Masa"}-${idx}`,
          label: a.tableLabel || a.tableId || tr("Masă VIP", "VIP table"),
          days,
          seats: toNumber(a.seats),
        };
      });
    }

    if (selectedVipTable) {
      return [
        {
          key: selectedVipTable,
          label: selectedVipTable,
          days: "",
          seats: vipItemsCount,
        },
      ];
    }

    return [];
  }, [hasVipItems, vipAllocations, selectedVipTable, vipItemsCount, lang]);

  const vipStatusText = useMemo(() => {
    if (!hasVipItems) return null;

    if (vipAllocations.length > 0) {
      return isVipAllocationComplete
        ? tr("Alocare VIP completă", "VIP allocation complete")
        : tr("Alocare VIP incompletă", "VIP allocation incomplete");
    }

    return selectedVipTable
      ? tr("Masă VIP selectată", "VIP table selected")
      : tr("Nicio masă selectată încă", "No table selected yet");
  }, [
    hasVipItems,
    vipAllocations.length,
    isVipAllocationComplete,
    selectedVipTable,
    tr,
  ]);

  async function handleStartCheckout() {
    if (!canProceedToPayment || !publicOrderToken || isCreatingCheckout) return;

    setCheckoutError(null);
    setIsCreatingCheckout(true);

    const email = billingEmail.trim();
    const emailConfirm = billingEmailConfirm.trim();
    const phone = billingPhone.trim();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailLooksValid) {
      setCheckoutError(
        tr(
          "Te rugăm să introduci o adresă de email validă.",
          "Please enter a valid email address.",
        ),
      );
      setIsCreatingCheckout(false);
      return;
    }

    if (email !== emailConfirm) {
      setCheckoutError(
        tr(
          "Adresele de email nu coincid. Te rugăm să verifici.",
          "Email addresses do not match. Please verify.",
        ),
      );
      setIsCreatingCheckout(false);
      return;
    }

    if (!phone) {
      setCheckoutError(
        tr(
          "Te rugăm să introduci un număr de telefon.",
          "Please enter a phone number.",
        ),
      );
      setIsCreatingCheckout(false);
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          orderToken: publicOrderToken,
          token: publicOrderToken,
          publicToken: publicOrderToken,
          email,
          customer_email: email,
          phone,
          customer_phone: phone,
          customer: { email, phone },
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        const message =
          (typeof payload.error === "string" && payload.error) ||
          (typeof payload.message === "string" && payload.message) ||
          tr(
            `Nu am putut porni plata (${res.status}).`,
            `Could not start payment (${res.status}).`,
          );
        throw new Error(message);
      }

      const checkoutUrl =
        (typeof payload.url === "string" && payload.url) ||
        (typeof payload.checkoutUrl === "string" && payload.checkoutUrl) ||
        (typeof payload.sessionUrl === "string" && payload.sessionUrl) ||
        (payload.data &&
        typeof payload.data === "object" &&
        typeof (payload.data as Record<string, unknown>).url === "string"
          ? ((payload.data as Record<string, unknown>).url as string)
          : null);

      if (!checkoutUrl) {
        throw new Error(
          tr(
            "Răspunsul de la server nu conține URL-ul Stripe Checkout.",
            "Server response did not include the Stripe Checkout URL.",
          ),
        );
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(
        "[checkout] Failed to create Stripe checkout session:",
        error,
      );
      setCheckoutError(
        error instanceof Error
          ? error.message
          : tr(
              "A apărut o eroare la inițierea plății.",
              "An error occurred while starting the payment.",
            ),
      );
    } finally {
      setIsCreatingCheckout(false);
    }
  }

  return (
    <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
        <div className="fixed top-20 left-0 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#7C4DFF]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-16">
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
            <div className="flex flex-col gap-3 mb-2">
              {/* Progress bar (3 pași) */}
              <div className="flex flex-col gap-3 mb-2">
                <div className="flex gap-6 justify-between items-end">
                  <p className="text-white text-base font-medium leading-normal">
                    {tr("Progres Rezervare", "Booking progress")}
                  </p>
                  <p className="text-[#00E5FF]/80 text-sm font-normal leading-normal">
                    {tr("Pasul 3 din 3", "Step 3 of 3")}
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-[#341C61]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#FFD700] to-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.35)]"
                    style={{ width: "100%" }}
                  ></div>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-8 bg-gradient-to-b from-[#00E5FF] to-[#7C4DFF] rounded-full block"></span>
                {tr("Finalizare Comandă", "Checkout")}
              </h1>
              <p className="text-[#B39DDB] text-base font-normal pl-5">
                {tr(
                  "Completează detaliile pentru a primi biletele Banaton Fest 2026 pe email.",
                  "Enter your details to receive your Banaton Fest 2026 tickets by email.",
                )}
              </p>
            </div>

            {isPaid && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">
                {tr(
                  "Plata este confirmată. Poți merge la pagina de bilete / confirmare.",
                  "Payment confirmed. You can go to your tickets / confirmation page.",
                )}
                <div className="mt-3">
                  <Link
                    href={`/success?order=${encodeURIComponent(publicOrderToken || "")}`}
                    className="text-[#00E5FF] hover:underline"
                  >
                    {tr("Vezi confirmarea", "View confirmation")}
                  </Link>
                </div>
              </div>
            )}

            {isPending && !isPaid && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
                {tr(
                  "Așteptăm confirmarea plății (Stripe webhook). Status comanda:",
                  "Waiting for payment confirmation (Stripe webhook). Order status:",
                )}{" "}
                <span className="font-semibold">
                  {orderDraft?.status || "pending"}
                </span>
              </div>
            )}

            {/* Date pentru bilete */}
            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <div className="flex items-center gap-4 mb-6 border-b border-[#432C7A] pb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 font-bold text-lg shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                  1
                </div>
                <h3 className="text-white text-xl font-bold tracking-tight">
                  {tr("Date pentru bilete", "Ticket details")}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email Field */}
                <label className="flex flex-col gap-2 md:col-span-1 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">
                    {tr("Adresă de Email", "Email address")}
                  </span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">
                      mail
                    </span>
                    <input
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="nume@exemplu.com"
                      className="w-full bg-[#1A0B2E] border border-[#432C7A] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all shadow-inner"
                    />
                  </div>
                </label>

                {/* Confirm Email Field */}
                <label className="flex flex-col gap-2 md:col-span-1 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">
                    {tr("Confirmă Email", "Confirm Email")}
                  </span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">
                      mark_email_read
                    </span>
                    <input
                      type="email"
                      value={billingEmailConfirm}
                      onChange={(e) => setBillingEmailConfirm(e.target.value)}
                      placeholder="nume@exemplu.com"
                      className={`w-full bg-[#1A0B2E] border rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all shadow-inner ${
                        billingEmailConfirm.length > 0 &&
                        billingEmail !== billingEmailConfirm
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-[#432C7A] focus:border-[#00E5FF] focus:ring-[#00E5FF]"
                      }`}
                    />
                  </div>
                  {/* Optional validation message */}
                  {billingEmailConfirm.length > 0 &&
                    billingEmail !== billingEmailConfirm && (
                      <span className="text-red-400 text-xs mt-1">
                        {tr(
                          "Adresele de email nu coincid.",
                          "Emails do not match.",
                        )}
                      </span>
                    )}
                </label>

                {/* Phone Field */}
                <label className="flex flex-col gap-2 md:col-span-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">
                    {tr("Telefon", "Phone")}
                  </span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">
                      phone
                    </span>
                    <input
                      type="tel"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full bg-[#1A0B2E] border border-[#432C7A] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all shadow-inner"
                    />
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Sidebar Sumar Comandă */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            <div className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl sticky top-8">
              <h3 className="text-white text-xl font-bold tracking-tight mb-6 pb-4 border-b border-[#432C7A]">
                {tr("Sumar Comandă", "Order Summary")}
              </h3>

              {!isLoaded ? (
                <div className="text-center text-[#B39DDB] py-8">
                  <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-[#00E5FF]">
                    sync
                  </span>
                  <p>{tr("Încărcare...", "Loading...")}</p>
                </div>
              ) : !orderDraft || orderDraft.items.length === 0 ? (
                <div className="text-center text-[#B39DDB] py-8">
                  <p>{tr("Coșul este gol.", "Cart is empty.")}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#432C7A] scrollbar-track-transparent">
                    {orderDraft.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start border-b border-[#432C7A]/50 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex-1 pr-4">
                          <p className="font-semibold text-white">
                            {normalizeTicketTitle(
                              item.label || item.name || "",
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[#00E5FF] text-xs font-medium px-2 py-0.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                              {displayCategoryLabel(item.category)}
                            </span>
                            <span className="text-[#B39DDB] text-sm">
                              x {item.qty ?? item.quantity}
                            </span>
                          </div>
                          {(item.variantLabel || item.durationLabel) && (
                            <p className="text-[#B39DDB] text-xs mt-1">
                              {item.variantLabel} {item.durationLabel}
                            </p>
                          )}
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="font-bold text-white">
                            {formatMoney(
                              item.totalPrice ?? item.lineTotal ?? 0,
                              lang,
                              orderDraft.currency,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#432C7A] space-y-3">
                    {hasVipItems && vipAllocationSummary.length > 0 && (
                      <div className="bg-[#1A0B2E] p-3 rounded-lg border border-[#432C7A]/50 mb-4">
                        <p className="text-xs text-[#B39DDB] mb-2 font-medium uppercase tracking-wider">
                          {tr("Alocare Mese VIP", "VIP Table Allocation")}
                        </p>
                        {vipAllocationSummary.map((alloc) => (
                          <div
                            key={alloc.key}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-white">{alloc.label}</span>
                            <span className="text-[#00E5FF]">
                              {alloc.seats} locuri
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg text-slate-300">
                        {tr("Total de plată", "Total to pay")}
                      </span>
                      <span className="text-2xl font-black text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                        {formatMoney(
                          safeDisplayTotal,
                          lang,
                          orderDraft.currency,
                        )}
                      </span>
                    </div>

                    {checkoutError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-4">
                        {checkoutError}
                      </div>
                    )}

                    <button
                      onClick={handleStartCheckout}
                      disabled={!canProceedToPayment || isCreatingCheckout}
                      className="w-full bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                      {isCreatingCheckout ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined animate-spin">
                            sync
                          </span>
                          {tr("Se procesează...", "Processing...")}
                        </span>
                      ) : (
                        payLabel
                      )}
                    </button>

                    <p className="text-center text-xs text-[#B39DDB] mt-4 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        lock
                      </span>
                      {tr(
                        "Plată securizată prin Stripe",
                        "Secured payment by Stripe",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

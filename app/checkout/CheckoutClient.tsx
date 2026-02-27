"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function formatLei(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)} lei`;
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

function normalizeDayCodeLabel(day: string) {
  const d = String(day || "")
    .trim()
    .toUpperCase();
  if (d === "FRI") return "Vineri";
  if (d === "SAT") return "Sâmbătă";
  if (d === "SUN") return "Duminică";
  if (d === "MON") return "Luni";
  return d || "Zi necunoscută";
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
      (typeof candidate.customer_email === "string" &&
        candidate.customer_email) ||
      undefined,
    customerPhone:
      (typeof candidate.customerPhone === "string" &&
        candidate.customerPhone) ||
      (typeof candidate.customer_phone === "string" &&
        candidate.customer_phone) ||
      undefined,
    billingCity:
      (typeof candidate.billingCity === "string" && candidate.billingCity) ||
      (typeof candidate.billing_city === "string" && candidate.billing_city) ||
      undefined,
    billingCounty:
      (typeof candidate.billingCounty === "string" &&
        candidate.billingCounty) ||
      (typeof candidate.billing_county === "string" &&
        candidate.billing_county) ||
      undefined,
    billingAddress:
      (typeof candidate.billingAddress === "string" &&
        candidate.billingAddress) ||
      (typeof candidate.billing_address === "string" &&
        candidate.billing_address) ||
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
 *
 * This tries, in order:
 * 1) GET /api/order/{token} and looks for allocations-like fields
 * 2) GET /api/order/{token}/vip-allocation (if you have it)
 * 3) (optional fallback) sessionStorage if nothing else works
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

  // 3) optional fallback (keeps old behavior if you don't yet have a GET endpoint)
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

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const queryToken = searchParams?.get("order") ?? null;

  const [orderDraft, setOrderDraft] = useState<DraftOrder | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // legacy single table (old UI)
  const [selectedVipTable, setSelectedVipTable] = useState<string | null>(null);

  // ✅ now filled from API, not from sessionStorage
  const [vipAllocations, setVipAllocations] = useState<VipAllocationDraft[]>(
    [],
  );

  const [publicOrderToken, setPublicOrderToken] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

  // ✅ payment status UX
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

        // 1) order (source of truth)
        const apiOrder = await fetchOrderByToken(resolvedToken);

        // 2) vip allocations (source of truth)
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

          // Option A: hydrate only email if backend provides it
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
          setCheckoutError("Nu am putut încărca datele comenzii.");
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

  // ✅ Poll until Stripe webhook confirms (status becomes "paid")
  useEffect(() => {
    if (!publicOrderToken) return;
    if (!orderDraft) return;

    const status = String(orderDraft.status || "").toLowerCase();
    if (status === "paid") return;

    // only poll when it makes sense
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

  // Legacy compatibility if API doesn't return allocations but returns selection
  const hasLegacyVipSelection = !!selectedVipTable;
  const hasNewVipAllocations = vipAllocations.length > 0;

  const isVipAllocationComplete = useMemo(() => {
    if (!requiresVipTable) return true;

    if (hasNewVipAllocations) {
      const totalAllocated = vipAllocations.reduce(
        (sum, a) => sum + toNumber(a.seats),
        0,
      );

      // if frontend can't validate per day, validate total count
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
    ? `Plătește ${formatLei(safeDisplayTotal)}`
    : "Plătește";

  const isBillingFormComplete = useMemo(() => {
    return billingEmail.trim().length > 0 && billingPhone.trim().length > 0;
  }, [billingEmail, billingPhone]);

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
        const days = (a.dayCodes || []).map(normalizeDayCodeLabel).join(", ");
        return {
          key: `${a.tableLabel || a.tableId || "Masa"}-${idx}`,
          label: a.tableLabel || a.tableId || "Masă VIP",
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
  }, [hasVipItems, vipAllocations, selectedVipTable, vipItemsCount]);

  const vipStatusText = useMemo(() => {
    if (!hasVipItems) return null;

    if (vipAllocations.length > 0) {
      return isVipAllocationComplete
        ? "Alocare VIP completă"
        : "Alocare VIP incompletă";
    }

    return selectedVipTable
      ? "Masă VIP selectată"
      : "Nicio masă selectată încă";
  }, [
    hasVipItems,
    vipAllocations.length,
    isVipAllocationComplete,
    selectedVipTable,
  ]);

  async function handleStartCheckout() {
    if (!canProceedToPayment || !publicOrderToken || isCreatingCheckout) return;

    setCheckoutError(null);
    setIsCreatingCheckout(true);

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
          email: billingEmail.trim(),
          customer_email: billingEmail.trim(),
          phone: billingPhone.trim(),
          customer_phone: billingPhone.trim(),
          customer: {
            email: billingEmail.trim(),
            phone: billingPhone.trim(),
          },
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
          `Nu am putut porni plata (${res.status}).`;
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
          "Răspunsul de la server nu conține URL-ul Stripe Checkout.",
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
          : "A apărut o eroare la inițierea plății.",
      );
    } finally {
      setIsCreatingCheckout(false);
    }
  }

  // UI below is unchanged stylistically; only behavior changed above.
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
                    Progres Rezervare
                  </p>
                  <p className="text-[#00E5FF]/80 text-sm font-normal leading-normal">
                    Pasul 3 din 3
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
                Finalizare Comandă
              </h1>
              <p className="text-[#B39DDB] text-base font-normal pl-5">
                Completează detaliile pentru a primi biletele Banaton Fest 2026 pe email.
              </p>
            </div>

            {isPaid && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">
                Plata este confirmată. Poți merge la pagina de bilete /
                confirmare.
                <div className="mt-3">
                  <Link
                    href={`/success?order=${encodeURIComponent(publicOrderToken || "")}`}
                    className="text-[#00E5FF] hover:underline"
                  >
                    Vezi confirmarea
                  </Link>
                </div>
              </div>
            )}

            {isPending && !isPaid && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
                Așteptăm confirmarea plății (Stripe webhook). Status comanda:{" "}
                <span className="font-semibold">
                  {orderDraft?.status || "pending"}
                </span>
              </div>
            )}

            {/* Date facturare */}
            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <div className="flex items-center gap-4 mb-6 border-b border-[#432C7A] pb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 font-bold text-lg shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                  1
                </div>
                <h3 className="text-white text-xl font-bold tracking-tight">
                  Date pentru bilete
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2 md:col-span-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">
                    Adresă de Email
                  </span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">
                      mail
                    </span>
                    <input
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200"
                      placeholder="ion.popescu@email.com"
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      disabled={isPaid}
                    />
                  </div>
                  <p className="text-xs text-[#B39DDB] mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      info
                    </span>
                    Biletele vor fi trimise la această adresă.
                  </p>
                </label>
                <label className="flex flex-col gap-2 md:col-span-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">
                    Telefon
                  </span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">
                      call
                    </span>
                    <input
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200"
                      placeholder="07xx xxx xxx"
                      type="tel"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      disabled={isPaid}
                    />
                  </div>
                </label>
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 relative">
            <div className="sticky top-28 flex flex-col gap-6">
              <div className="rounded-2xl bg-[#2D1B4E] border border-[#432C7A] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="bg-[#24123E] px-6 py-5 border-b border-[#432C7A] flex items-center justify-between relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/10 to-transparent"></div>
                  <h3 className="text-white text-lg font-bold relative z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FFD700]">
                      shopping_cart
                    </span>
                    Sumar Comandă
                  </h3>
                </div>

                <div className="p-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    {!isLoaded ? (
                      <div className="text-[#B39DDB] text-sm bg-[#1A0B2E]/30 p-4 rounded-xl border border-[#432C7A]">
                        Se încarcă sumarul comenzii...
                      </div>
                    ) : !publicOrderToken ? (
                      <div className="text-[#B39DDB] text-sm bg-[#1A0B2E]/30 p-4 rounded-xl border border-[#432C7A]">
                        Lipsește tokenul comenzii din URL.{" "}
                        <Link
                          href="/tickets"
                          className="text-[#00E5FF] hover:underline"
                        >
                          Mergi la bilete
                        </Link>
                      </div>
                    ) : !orderDraft || orderDraft.items.length === 0 ? (
                      <div className="text-[#B39DDB] text-sm bg-[#1A0B2E]/30 p-4 rounded-xl border border-[#432C7A]">
                        Nu există produse în comandă sau comanda nu a putut fi
                        încărcată.{" "}
                        <Link
                          href="/tickets"
                          className="text-[#00E5FF] hover:underline"
                        >
                          Mergi la bilete
                        </Link>{" "}
                        pentru a selecta biletele.
                      </div>
                    ) : (
                      <>
                        {orderDraft.items.map((item) => {
                          const safeQty = toNumber(item.qty ?? item.quantity);
                          const safeUnitPrice = toNumber(
                            item.unitPrice ?? item.price,
                          );
                          const savedLineTotal = toNumber(
                            item.totalPrice ?? item.lineTotal,
                          );

                          const fallbackUnitPrice =
                            safeUnitPrice > 0
                              ? safeUnitPrice
                              : orderDraft.items.length === 1 && safeQty > 0
                                ? subtotal / safeQty
                                : 0;

                          const lineTotal =
                            savedLineTotal > 0
                              ? savedLineTotal
                              : safeQty * fallbackUnitPrice;

                          const displayName =
                            item.name || item.label || "Bilet";

                          return (
                            <div
                              key={item.id}
                              className="flex justify-between items-start gap-3 group bg-[#1A0B2E]/30 p-3 rounded-xl border border-transparent hover:border-[#00E5FF]/30 transition-all"
                            >
                              <div className="w-14 h-14 rounded-lg shrink-0 border border-[#432C7A] shadow-sm bg-[#24123E] flex items-center justify-center">
                                <span
                                  className={`material-symbols-outlined text-xl ${
                                    item.category === "vip"
                                      ? "text-[#FFD700]"
                                      : "text-[#00E5FF]"
                                  }`}
                                >
                                  {item.category === "vip"
                                    ? "star"
                                    : "confirmation_number"}
                                </span>
                              </div>
                              <div className="flex flex-col grow">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-white font-bold text-sm">
                                    {item.category === "vip"
                                      ? "VIP"
                                      : "Acces General"}{" "}
                                    - {displayName}
                                  </span>
                                  <span className="text-[#FFD700] font-bold text-sm whitespace-nowrap">
                                    {formatLei(lineTotal)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-1 gap-2">
                                  <span className="text-[#B39DDB] text-xs bg-[#24123E] px-2 py-0.5 rounded">
                                    {item.variantLabel
                                      ? `${item.variantLabel} · `
                                      : ""}
                                    {safeQty} x {formatLei(fallbackUnitPrice)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {hasVipItems && (
                          <div className="rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-white font-bold text-sm">
                                  Rezervare masă VIP
                                </p>
                                <p className="text-[#B39DDB] text-xs mt-1">
                                  Obligatorie pentru biletele VIP selectate.
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-[#FFD700]">
                                table_restaurant
                              </span>
                            </div>

                            <div className="mt-3 text-sm">
                              {vipStatusText && (
                                <p
                                  className={
                                    isVipAllocationComplete
                                      ? "text-emerald-200"
                                      : "text-amber-200"
                                  }
                                >
                                  {vipStatusText}
                                </p>
                              )}

                              {vipAllocationSummary.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                  {vipAllocationSummary.map((row) => (
                                    <div
                                      key={row.key}
                                      className="rounded-lg bg-[#24123E]/80 border border-[#432C7A] px-3 py-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-white font-medium">
                                          {row.label}
                                        </span>
                                        <span className="text-[#FFD700] text-xs font-semibold">
                                          {row.seats} loc
                                          {row.seats === 1 ? "" : "uri"}
                                        </span>
                                      </div>
                                      {row.days ? (
                                        <p className="text-[#B39DDB] text-xs mt-1">
                                          {row.days}
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-amber-200 mt-2">
                                  Nicio masă selectată încă
                                </p>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-end">
                              <Link
                                href={vipSelectionHref}
                                className="text-xs px-3 py-2 rounded-lg border border-[#432C7A] bg-[#24123E] text-[#00E5FF] hover:text-white hover:border-[#00E5FF]/50 transition-colors"
                              >
                                {vipAllocationSummary.length > 0
                                  ? "Modifică alocarea VIP"
                                  : "Alege masa"}
                              </Link>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-[#432C7A] to-transparent w-full"></div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B39DDB]">Subtotal</span>
                      <span className="text-white font-medium">
                        {formatLei(subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-dashed border-[#432C7A] pt-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[#B39DDB] text-xs uppercase tracking-wider font-semibold mb-1">
                        Total de plată
                      </span>
                      <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                        {new Intl.NumberFormat("ro-RO", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(safeDisplayTotal)}{" "}
                        <span className="text-lg text-[#00E5FF]">
                          {(orderDraft?.currency || "RON").toLowerCase() ===
                          "ron"
                            ? "lei"
                            : orderDraft?.currency || "RON"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {!isVipAllocationComplete && hasVipItems && (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                      Ai bilete VIP în comandă. Finalizează alocarea meselor VIP
                      înainte de finalizarea comenzii.
                    </div>
                  )}

                  {!canProceedToPayment &&
                    !!orderDraft &&
                    orderDraft.items.length > 0 &&
                    !isPaid && (
                      <div className="rounded-xl border border-[#432C7A] bg-[#24123E]/70 p-3 text-sm text-[#D1C4E9]">
                        {"Completează emailul și numărul de telefon pentru a continua plata."}
                      </div>
                    )}

                  {checkoutError && (
                    <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                      {checkoutError}
                    </div>
                  )}

                  {isPaid ? (
                    <Link
                      href={`/success?order=${encodeURIComponent(publicOrderToken || "")}`}
                      className="w-full h-14 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 transform group bg-emerald-400/20 text-emerald-100 border border-emerald-400/30"
                    >
                      <span className="material-symbols-outlined font-bold">
                        verified
                      </span>
                      Plata confirmată — Vezi biletele
                    </Link>
                  ) : canProceedToPayment ? (
                    <button
                      type="button"
                      onClick={handleStartCheckout}
                      disabled={isCreatingCheckout}
                      className={`w-full h-14 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 transform group ${
                        isCreatingCheckout
                          ? "bg-[#3A2A55] text-[#D1C4E9] border border-[#4E3A72] cursor-wait"
                          : "bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:from-[#FFE066] hover:to-[#FDB931] text-[#24123E] shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] active:scale-[0.98]"
                      }`}
                    >
                      <span className="material-symbols-outlined font-bold group-hover:rotate-12 transition-transform">
                        {isCreatingCheckout ? "progress_activity" : "lock_open"}
                      </span>
                      {isCreatingCheckout ? "Se inițiază plata..." : payLabel}
                    </button>
                  ) : (
                    <Link
                      href={
                        !isBillingFormComplete
                          ? "/checkout"
                          : hasVipItems
                            ? vipSelectionHref
                            : "/tickets"
                      }
                      className="w-full h-14 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 transform group bg-[#24123E] text-[#B39DDB] border border-[#432C7A]"
                    >
                      <span className="material-symbols-outlined font-bold group-hover:rotate-12 transition-transform">
                        {!isBillingFormComplete
                          ? "edit_note"
                          : hasVipItems
                            ? "table_restaurant"
                            : "arrow_back"}
                      </span>
                      {!isBillingFormComplete
                        ? "Completează datele"
                        : hasVipItems
                          ? "Alege masa VIP"
                          : "Mergi la bilete"}
                    </Link>
                  )}

                  <p className="text-xs text-[#B39DDB] text-center mt-2">
                    Vei fi redirecționat către pagina securizată Stripe pentru a
                    finaliza plata.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#2D1B4E]/50 border border-[#432C7A] p-4 flex gap-4 items-center shadow-lg backdrop-blur-sm">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#7C4DFF] flex items-center justify-center text-white shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                  <span className="material-symbols-outlined text-[20px]">
                    support_agent
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold">
                    Ai nevoie de ajutor?
                  </span>
                  <span className="text-[#B39DDB] text-xs">
                    Pentru orice întrebare sau problemă legată de comandă, scrie-ne la{" "}
                    <a
                      className="text-[#00E5FF] hover:text-white hover:underline transition-colors"
                      href="mailto:office.banaton@gmail.com"
                    >
                      office.banaton@gmail.com
                    </a>
                    .
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* /Sidebar */}
        </div>
      </main>
    </div>
  );
}
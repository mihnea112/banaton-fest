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
  customerFirstName?: string;
  customerLastName?: string;
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
  dayCodes?: string[];
  seats?: number;
};

// Poți păstra asta doar pentru token fallback, dacă vrei
const PUBLIC_TOKEN_STORAGE_KEY = "banatonFestPublicToken";

// VIP allocations pot rămâne locale dacă pagina /vip le salvează local după PUT
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

    const seats = toNumber(r.seats);
    const tableLabel =
      typeof r.tableLabel === "string" && r.tableLabel.trim()
        ? r.tableLabel.trim()
        : typeof r.table_id === "string"
          ? r.table_id
          : typeof r.tableId === "string"
            ? r.tableId
            : undefined;

    const dayCodesRaw = Array.isArray(r.dayCodes)
      ? r.dayCodes
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

/**
 * Normalizează răspunsul API în DraftOrder.
 * Acceptă mai multe shape-uri ca să nu se spargă dacă endpointul diferă.
 */
function extractOrderFromApi(payload: unknown): DraftOrder | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;

  // endpoint-uri posibile:
  // { order: {...} }
  // { data: {...} }
  // {...direct order...}
  const candidate =
    (root.order as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined) ??
    root;

  if (!candidate || typeof candidate !== "object") return null;

  // Dacă ai items direct
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

      // Încearcă să deduci category din diferite câmpuri
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

  // optional vip table selection from API, if available
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
    customerFirstName:
      (typeof candidate.customerFirstName === "string" && candidate.customerFirstName) ||
      (typeof candidate.customer_first_name === "string" && candidate.customer_first_name) ||
      undefined,
    customerLastName:
      (typeof candidate.customerLastName === "string" && candidate.customerLastName) ||
      (typeof candidate.customer_last_name === "string" && candidate.customer_last_name) ||
      undefined,
    customerEmail:
      (typeof candidate.customerEmail === "string" && candidate.customerEmail) ||
      (typeof candidate.customer_email === "string" && candidate.customer_email) ||
      undefined,
    customerPhone:
      (typeof candidate.customerPhone === "string" && candidate.customerPhone) ||
      (typeof candidate.customer_phone === "string" && candidate.customer_phone) ||
      undefined,
    billingCity:
      (typeof candidate.billingCity === "string" && candidate.billingCity) ||
      (typeof candidate.billing_city === "string" && candidate.billing_city) ||
      undefined,
    billingCounty:
      (typeof candidate.billingCounty === "string" && candidate.billingCounty) ||
      (typeof candidate.billing_county === "string" && candidate.billing_county) ||
      undefined,
    billingAddress:
      (typeof candidate.billingAddress === "string" && candidate.billingAddress) ||
      (typeof candidate.billing_address === "string" && candidate.billing_address) ||
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
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Order fetch failed: ${res.status}`);
  }

  const payload = (await res.json()) as unknown;
  return extractOrderFromApi(payload);
}
import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
          <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
            <div className="rounded-2xl bg-[#2D1B4E]/70 backdrop-blur-md p-6 border border-[#432C7A] shadow-xl text-[#B39DDB]">
              Se încarcă pagina de checkout...
            </div>
          </main>
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Locale and i18n helpers ---
type Locale = "ro" | "en";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  const v = match.slice(name.length + 1);
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function getLocaleFromCookie(): Locale {
  const v = (getCookieValue("banaton_locale") || "ro").toLowerCase();
  return v === "en" ? "en" : "ro";
}

function t(locale: Locale, ro: string, en: string) {
  return locale === "en" ? en : ro;
}

const DAY_DATES: Record<DayCodeLower, string> = {
  fri: "29.05",
  sat: "30.05",
  sun: "31.05",
  mon: "01.06",
};

function dayLabel(locale: Locale, day: DayCodeLower) {
  const roName = day === "fri" ? "Vineri" : day === "sat" ? "Sâmbătă" : day === "sun" ? "Duminică" : "Luni";
  const enName = day === "fri" ? "Friday" : day === "sat" ? "Saturday" : day === "sun" ? "Sunday" : "Monday";
  return `${locale === "en" ? enName : roName} (${DAY_DATES[day]})`;
}

// Product/variant text overrides (prices remain unchanged)
const PRODUCT_I18N: Record<string, { roName?: string; enName?: string; roDesc?: string; enDesc?: string; roDuration?: string; enDuration?: string }> = {
  "gen-4day": {
    roName: "Abonament 4 Zile",
    enName: "4-Day Pass",
    roDuration: "4 Zile",
    enDuration: "4 Days",
    roDesc: "Acces Fan Pit pentru toate cele 4 zile ale festivalului (29.05–01.06.2026)",
    enDesc: "Fan Pit access for all 4 festival days (29.05–01.06.2026)",
  },
  "gen-3day": {
    roName: "Abonament 3 Zile",
    enName: "3-Day Pass",
    roDuration: "3 Zile",
    enDuration: "3 Days",
    roDesc: "Valabil pentru Vineri (29.05) + Duminică (31.05) + Luni (01.06)",
    enDesc: "Valid for Friday (29.05) + Sunday (31.05) + Monday (01.06)",
  },
  "gen-2day": {
    roName: "Abonament 2 Zile",
    enName: "2-Day Pass",
    roDuration: "2 Zile",
    enDuration: "2 Days",
    roDesc: "Alege orice 2 zile dintre Vineri (29.05), Duminică (31.05) și Luni (01.06)",
    enDesc: "Pick any 2 days between Friday (29.05), Sunday (31.05) and Monday (01.06)",
  },
  "gen-1day": {
    roName: "Bilet 1 Zi",
    enName: "1-Day Ticket",
    roDuration: "1 Zi",
    enDuration: "1 Day",
    roDesc: "Vineri (29.05), Duminică (31.05) și Luni (01.06): 50 RON / Sâmbătă (30.05): 80 RON",
    enDesc: "Fri (29.05), Sun (31.05) & Mon (01.06): 50 RON / Sat (30.05): 80 RON",
  },
  "vip-4day": {
    roName: "VIP 4 Zile",
    enName: "VIP 4 Days",
    roDuration: "4 Zile",
    enDuration: "4 Days",
    roDesc: "Acces VIP pentru toate cele 4 zile (masa se selectează în pagina de mese VIP)",
    enDesc: "VIP access for all 4 days (table selection happens on the VIP tables page)",
  },
  "vip-1day": {
    roName: "VIP - 1 Zi",
    enName: "VIP - 1 Day",
    roDuration: "1 Zi",
    enDuration: "1 Day",
    roDesc: "Include loc la masă (selectezi masa în pagina de mese VIP)",
    enDesc: "Includes a table seat (choose your table on the VIP tables page)",
  },
};

const VARIANT_I18N: Record<string, { ro: string; en: string }> = {
  // Fan Pit 2-day
  "gen-2day-fri-sun": { ro: "Vineri (29.05) + Duminică (31.05)", en: "Friday (29.05) + Sunday (31.05)" },
  "gen-2day-fri-mon": { ro: "Vineri (29.05) + Luni (01.06)", en: "Friday (29.05) + Monday (01.06)" },
  "gen-2day-sun-mon": { ro: "Duminică (31.05) + Luni (01.06)", en: "Sunday (31.05) + Monday (01.06)" },
  // Fan Pit 1-day
  "gen-1day-fri": { ro: "Vineri (29.05)", en: "Friday (29.05)" },
  "gen-1day-sat": { ro: "Sâmbătă (30.05)", en: "Saturday (30.05)" },
  "gen-1day-sun": { ro: "Duminică (31.05)", en: "Sunday (31.05)" },
  "gen-1day-mon": { ro: "Luni (01.06)", en: "Monday (01.06)" },
  // VIP 1-day
  "vip-1day-fri": { ro: "Vineri (29.05)", en: "Friday (29.05)" },
  "vip-1day-sat": { ro: "Sâmbătă (30.05) (CECA)", en: "Saturday (30.05) (CECA)" },
  "vip-1day-sun": { ro: "Duminică (31.05)", en: "Sunday (31.05)" },
  "vip-1day-mon": { ro: "Luni (01.06)", en: "Monday (01.06)" },
};

function localizeProduct(locale: Locale, p: TicketProduct) {
  const cfg = PRODUCT_I18N[p.id] || {};
  return {
    name: (locale === "en" ? cfg.enName : cfg.roName) || p.name,
    durationLabel: (locale === "en" ? cfg.enDuration : cfg.roDuration) || p.durationLabel,
    description: (locale === "en" ? cfg.enDesc : cfg.roDesc) || p.description,
  };
}

function localizeVariantLabel(locale: Locale, variantId: string, fallback: string) {
  const cfg = VARIANT_I18N[variantId];
  if (!cfg) return fallback;
  return locale === "en" ? cfg.en : cfg.ro;
}


type TicketCategory = "general" | "vip";

type DayCodeLower = "fri" | "sat" | "sun" | "mon";

type AvailabilityByDay = Partial<Record<DayCodeLower, number>>;

// --- Fan Pit package availability ---
type FanPitPackageKey =
  | "FANPIT_2DAY_FRI_SUN"
  | "FANPIT_2DAY_FRI_MON"
  | "FANPIT_2DAY_SUN_MON"
  | "FANPIT_3DAY_FRI_SUN_MON"
  | "FANPIT_4DAY_ALL";

type PackageAvailability = Partial<Record<FanPitPackageKey, number>>;

// Accept many possible shapes for package-level availability.
function normalizePackageAvailabilityPayload(payload: unknown): PackageAvailability {
  // Accepts: { byPackage: { ... } } or { by_package: { ... } } or { packages: { ... } } etc.
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, any>;
  const candidate =
    root.byPackage ??
    root.by_package ??
    root.packages ??
    root.availabilityByPackage ??
    root.data?.byPackage ??
    root.data?.by_package ??
    root.data?.packages ??
    root.data?.availabilityByPackage ??
    root.data?.availability_by_package ??
    root.data ??
    root;

  const keys: FanPitPackageKey[] = [
    "FANPIT_2DAY_FRI_SUN",
    "FANPIT_2DAY_FRI_MON",
    "FANPIT_2DAY_SUN_MON",
    "FANPIT_3DAY_FRI_SUN_MON",
    "FANPIT_4DAY_ALL",
  ];
  const out: PackageAvailability = {};
  if (candidate && typeof candidate === "object") {
    for (const k of keys) {
      let v = candidate[k];
      if (typeof v === "number" || typeof v === "string") {
        out[k] = clampInt(v, 0);
        continue;
      }
      if (v && typeof v === "object") {
        if ("remaining" in v) {
          out[k] = clampInt((v as any).remaining, 0);
          continue;
        }
        if ("free" in v) {
          out[k] = clampInt((v as any).free, 0);
          continue;
        }
      }
    }
  }
  return out;
}

// Derive package-level availability from per-day availability if backend does not provide it.
function derivePackageAvailabilityFromDays(days: AvailabilityByDay): PackageAvailability {
  // Conservative fallback: a package can only be sold if ALL included days have capacity.
  // So remaining = min(remaining(day_i)). If a day is missing, we omit that package.
  const get = (d: DayCodeLower) => (typeof days[d] === "number" ? (days[d] as number) : null);

  const min2 = (a: number | null, b: number | null) => {
    if (a === null || b === null) return null;
    return Math.min(a, b);
  };

  const min3 = (a: number | null, b: number | null, c: number | null) => {
    if (a === null || b === null || c === null) return null;
    return Math.min(a, b, c);
  };

  const min4 = (a: number | null, b: number | null, c: number | null, d: number | null) => {
    if (a === null || b === null || c === null || d === null) return null;
    return Math.min(a, b, c, d);
  };

  const fri = get("fri");
  const sat = get("sat");
  const sun = get("sun");
  const mon = get("mon");

  const out: PackageAvailability = {};

  const v2_fs = min2(fri, sun);
  const v2_fm = min2(fri, mon);
  const v2_sm = min2(sun, mon);
  const v3_fsm = min3(fri, sun, mon);
  const v4_all = min4(fri, sat, sun, mon);

  if (typeof v2_fs === "number") out.FANPIT_2DAY_FRI_SUN = v2_fs;
  if (typeof v2_fm === "number") out.FANPIT_2DAY_FRI_MON = v2_fm;
  if (typeof v2_sm === "number") out.FANPIT_2DAY_SUN_MON = v2_sm;
  if (typeof v3_fsm === "number") out.FANPIT_3DAY_FRI_SUN_MON = v3_fsm;
  if (typeof v4_all === "number") out.FANPIT_4DAY_ALL = v4_all;

  return out;
}

function clampInt(n: unknown, fallback = 0) {
  const x = Math.floor(Number(n));
  return Number.isFinite(x) ? x : fallback;
}

function parseDayLower(v: unknown): DayCodeLower | null {
  const s = String(v || "").trim().toLowerCase();
  if (s === "fri" || s === "sat" || s === "sun" || s === "mon") return s;
  return null;
}

function parseDayUpperToLower(v: unknown): DayCodeLower | null {
  const s = String(v || "").trim().toUpperCase();
  if (s === "FRI") return "fri";
  if (s === "SAT") return "sat";
  if (s === "SUN") return "sun";
  if (s === "MON") return "mon";
  return null;
}

function normalizeAvailabilityPayload(payload: unknown): AvailabilityByDay {
  // Accept many possible shapes so UI never hard-crashes.
  // Supported examples:
  // { ok:true, availability:{ fri:123, sat:0, ... } }
  // { ok:true, data:{ FRI:{ remaining:123 }, SAT:{ remaining:0 } } }
  // { fri:123, sat:0 }
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, any>;

  const candidate =
    root.byDay ??
    root.by_day ??
    root.availability ??
    root.remaining ??
    root.days ??
    root.data?.byDay ??
    root.data?.by_day ??
    root.data?.availability ??
    root.data?.remaining ??
    root.data?.days ??
    root.data ??
    root;

  const out: AvailabilityByDay = {};

  if (candidate && typeof candidate === "object") {
    for (const [k, v] of Object.entries(candidate)) {
      const lower = parseDayLower(k) ?? parseDayUpperToLower(k);
      if (!lower) continue;

      if (typeof v === "number" || typeof v === "string") {
        out[lower] = clampInt(v, 0);
        continue;
      }

      if (v && typeof v === "object") {
        // common: { remaining: 123 }
        if ("remaining" in v) {
          out[lower] = clampInt((v as any).remaining, 0);
          continue;
        }
        // or { free: 123 }
        if ("free" in v) {
          out[lower] = clampInt((v as any).free, 0);
          continue;
        }
      }
    }
  }

  return out;
}



interface ProductVariant {
  id: string;
  label: string;
  price: number;
}

interface TicketProduct {
  id: string;
  category: TicketCategory;
  name: string;
  durationLabel: string;
  price: number; // Base price or starting price
  description?: string;
  variants?: ProductVariant[];
}

type ApiProductCode =
  | "GENERAL_1_DAY"
  | "GENERAL_2_DAY"
  | "GENERAL_3_DAY"
  | "GENERAL_4_DAY"
  | "VIP_1_DAY"
  | "VIP_4_DAY";

type ApiDraftCreateResponse = {
  ok?: boolean;
  order?: {
    publicToken?: string;
  };
};

type ApiErrorLike = {
  error?: { message?: string };
  message?: string;
};

const PRODUCTS: TicketProduct[] = [
  // Fan Pit
  {
    id: "gen-4day",
    category: "general",
    name: "Abonament 4 Zile",
    durationLabel: "4 Zile",
    price: 120,
    description:
      "Acces Fan Pit pentru toate cele 4 zile ale festivalului (29.05–01.06.2026)",
  },
  {
    id: "gen-3day",
    category: "general",
    name: "Abonament 3 Zile",
    durationLabel: "3 Zile",
    price: 80,
    description: "Valabil pentru Vineri (29.05) + Duminică (31.05) + Luni (01.06)",
  },
  {
    id: "gen-2day",
    category: "general",
    name: "Abonament 2 Zile",
    durationLabel: "2 Zile",
    price: 60,
    description: "Alege orice 2 zile dintre Vineri (29.05), Duminică (31.05) și Luni (01.06)",
    variants: [
      { id: "gen-2day-fri-sun", label: "Vineri (29.05) + Duminică (31.05)", price: 60 },
      { id: "gen-2day-fri-mon", label: "Vineri (29.05) + Luni (01.06)", price: 60 },
      { id: "gen-2day-sun-mon", label: "Duminică (31.05) + Luni (01.06)", price: 60 },
    ],
  },
  {
    id: "gen-1day",
    category: "general",
    name: "Bilet 1 Zi",
    durationLabel: "1 Zi",
    price: 50,
    description: "Vineri (29.05), Duminică (31.05) și Luni (01.06): 50 RON / Sâmbătă (30.05): 80 RON",
    variants: [
      { id: "gen-1day-fri", label: "Vineri (29.05)", price: 50 },
      { id: "gen-1day-sat", label: "Sâmbătă (30.05)", price: 80 },
      { id: "gen-1day-sun", label: "Duminică (31.05)", price: 50 },
      { id: "gen-1day-mon", label: "Luni (01.06)", price: 50 },
    ],
  },

  // VIP
  {
    id: "vip-4day",
    category: "vip",
    name: "VIP 4 Zile",
    durationLabel: "4 Zile",
    price: 750,
    description:
      "Acces VIP pentru toate cele 4 zile (masa se selectează în pagina de mese VIP)",
  },
  {
    id: "vip-1day",
    category: "vip",
    name: "VIP - 1 Zi",
    durationLabel: "1 Zi",
    price: 200,
    description: "Include loc la masă (selectezi masa în pagina de mese VIP)",
    variants: [
      { id: "vip-1day-fri", label: "Vineri (29.05)", price: 200 },
      { id: "vip-1day-sat", label: "Sâmbătă (30.05) (CECA)", price: 350 },
      { id: "vip-1day-sun", label: "Duminică (31.05)", price: 200 },
      { id: "vip-1day-mon", label: "Luni (01.06)", price: 200 },
    ],
  },
];

export default function Tickets() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ro");

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, []);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fan Pit availability (remaining tickets) per day
  const [fanPitAvailability, setFanPitAvailability] = useState<AvailabilityByDay>({});
  const [fanPitPackageAvailability, setFanPitPackageAvailability] = useState<PackageAvailability>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      setIsLoadingAvailability(true);
      try {
        // This endpoint should return remaining tickets for Fan Pit per day.
        // If it doesn't exist yet, UI will simply hide the numbers.
        const res = await fetch("/api/fanpit/availability?days=fri,sat,sun,mon", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const json = (await res.json().catch(() => ({}))) as unknown;
        if (!res.ok) {
          // Don’t hard error; just keep empty.
          if (!cancelled) {
            setFanPitAvailability({});
            setFanPitPackageAvailability({});
          }
          return;
        }

        const normalizedDays = normalizeAvailabilityPayload(json);
        const normalizedPackagesFromApi = normalizePackageAvailabilityPayload(json);

        // If backend doesn't return packages yet, derive them from day remaining.
        const normalizedPackages =
          Object.keys(normalizedPackagesFromApi).length > 0
            ? normalizedPackagesFromApi
            : derivePackageAvailabilityFromDays(normalizedDays);

        if (!cancelled) {
          setFanPitAvailability(normalizedDays);
          setFanPitPackageAvailability(normalizedPackages);
        }
      } catch {
        if (!cancelled) {
          setFanPitAvailability({});
          setFanPitPackageAvailability({});
        }
      } finally {
        if (!cancelled) setIsLoadingAvailability(false);
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatAvailability = (day: DayCodeLower) => {
    const v = fanPitAvailability[day];
    if (typeof v !== "number") return null;
    return `${v} ${t(locale, "disponibile", "available")}`;
  };

  const getRemainingForDays = (days: DayCodeLower[]) => {
    if (!days.length) return null;
    const nums: number[] = [];
    for (const d of days) {
      const v = fanPitAvailability[d];
      if (typeof v !== "number") return null;
      nums.push(v);
    }
    return nums.length ? Math.min(...nums) : null;
  };

  const formatPackAvailability = (days: DayCodeLower[]) => {
    const n = getRemainingForDays(days);
    if (typeof n !== "number") return null;
    return `${n} ${t(locale, "disponibile", "available")}`;
  };

  const dayFromVariantId = (variantId: string): DayCodeLower | null => {
    // Fan Pit 1-day
    if (variantId === "gen-1day-fri") return "fri";
    if (variantId === "gen-1day-sat") return "sat";
    if (variantId === "gen-1day-sun") return "sun";
    if (variantId === "gen-1day-mon") return "mon";

    // VIP 1-day (optional display, but we only show Fan Pit availability)
    if (variantId === "vip-1day-fri") return "fri";
    if (variantId === "vip-1day-sat") return "sat";
    if (variantId === "vip-1day-sun") return "sun";
    if (variantId === "vip-1day-mon") return "mon";

    return null;
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to find product details (including variants) by ID
  const getProductDetails = (id: string) => {
    for (const p of PRODUCTS) {
      if (p.id === id) return { ...p, variantLabel: null };
      if (p.variants) {
        const v = p.variants.find((v) => v.id === id);
        if (v)
          return {
            ...p,
            id: v.id,
            name: p.name,
            price: v.price,
            variantLabel: v.label,
          };
      }
    }
    return null;
  };

  const totalAmount = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = getProductDetails(id);
      return sum + (product ? product.price * qty : 0);
    }, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }, [cart]);

  const orderItems = Object.entries(cart)
    .map(([id, qty]) => {
      const product = getProductDetails(id);
      if (!product || qty <= 0) return null;

      const productApiCode: ApiProductCode | null = (() => {
        if (id.startsWith("gen-1day-")) return "GENERAL_1_DAY";
        if (id.startsWith("gen-2day-")) return "GENERAL_2_DAY";
        if (id === "gen-3day") return "GENERAL_3_DAY";
        if (id === "gen-4day") return "GENERAL_4_DAY";
        if (id.startsWith("vip-1day-")) return "VIP_1_DAY";
        if (id === "vip-4day") return "VIP_4_DAY";
        return null;
      })();

      return {
        id,
        qty,
        category: product.category,
        name: product.name,
        variantLabel:
          (product as { variantLabel?: string | null }).variantLabel ?? null,
        unitPrice: product.price,
        totalPrice: product.price * qty,
        productApiCode,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    qty: number;
    category: TicketCategory;
    name: string;
    variantLabel: string | null;
    unitPrice: number;
    totalPrice: number;
    productApiCode: ApiProductCode | null;
  }>;

  const hasVipInCart = orderItems.some((item) => item.category === "vip");

  const mapCartIdToDayCodes = (
    cartId: string,
  ): Array<"fri" | "sat" | "sun" | "mon"> => {
    const map: Record<string, Array<"fri" | "sat" | "sun" | "mon">> = {
      "gen-1day-fri": ["fri"],
      "gen-1day-sat": ["sat"],
      "gen-1day-sun": ["sun"],
      "gen-1day-mon": ["mon"],

      "gen-2day-fri-sun": ["fri", "sun"],
      "gen-2day-fri-mon": ["fri", "mon"],
      "gen-2day-sun-mon": ["sun", "mon"],

      "gen-3day": ["fri", "sun", "mon"],
      "gen-4day": ["fri", "sat", "sun", "mon"],

      "vip-1day-fri": ["fri"],
      "vip-1day-sat": ["sat"],
      "vip-1day-sun": ["sun"],
      "vip-1day-mon": ["mon"],
      "vip-4day": ["fri", "sat", "sun", "mon"],
    };

    return map[cartId] ?? [];
  };

  const buildApiItemsPayload = () => {
    return orderItems
      .map((item) => {
        if (!item.productApiCode) return null;

        const selectedDayCodes = mapCartIdToDayCodes(item.id);

        return {
          productCode: item.productApiCode,
          qty: item.qty,
          ...(selectedDayCodes.length > 0 ? { selectedDayCodes } : {}),
        };
      })
      .filter(Boolean);
  };

  const handleContinue = async () => {
    if (totalItems <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const createDraftOrder = async () => {
        console.log("[tickets] creating draft order...");
        const createRes = await fetch("/api/order/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "web" }),
        });

        const createJson = (await createRes
          .json()
          .catch(() => ({}))) as ApiDraftCreateResponse & ApiErrorLike;

        console.log("[tickets] draft create response", {
          status: createRes.status,
          ok: createRes.ok,
          body: createJson,
        });

        if (!createRes.ok || !createJson?.order?.publicToken) {
          throw new Error(
            createJson?.error?.message ||
              createJson?.message ||
              "Nu s-a putut crea comanda draft.",
          );
        }

        return createJson.order.publicToken;
      };

      const putItems = async (token: string) => {
        const apiItems = buildApiItemsPayload();
        console.log("[tickets] PUT /api/order/:token/items payload", {
          publicToken: token,
          items: apiItems,
        });

        const res = await fetch(`/api/order/${token}/items`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: apiItems }),
        });

        const json = (await res.json().catch(() => ({}))) as ApiErrorLike;

        console.log("[tickets] items save response", {
          status: res.status,
          ok: res.ok,
          body: json,
        });

        return { res, json };
      };

      const publicToken = await createDraftOrder();
      const { res: itemsRes, json: itemsJson } = await putItems(publicToken);

      if (!itemsRes.ok) {
        throw new Error(
          itemsJson?.error?.message ||
            itemsJson?.message ||
            "Nu s-au putut salva biletele în comandă.",
        );
      }

      if (hasVipInCart) {
        router.push(`/vip?order=${publicToken}`);
        return;
      }

      router.push(`/checkout?order=${publicToken}`);
    } catch (error) {
      console.error("[tickets] handleContinue error", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "A apărut o eroare la salvarea comenzii.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuantityControls = (
    id: string,
    price: number,
    compact = false,
  ) => {
    const qty = cart[id] || 0;
    return (
      <div
        className={cn(
          "flex items-center gap-3 bg-brand-deep/50 rounded-lg p-1 border border-white/10",
          compact && "gap-2",
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(id, -1);
          }}
          className={cn(
            "rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors disabled:opacity-30",
            compact ? "size-6" : "size-8",
          )}
          disabled={qty === 0}
        >
          <span className="material-symbols-outlined text-sm font-bold">
            remove
          </span>
        </button>
        <span
          className={cn(
            "font-bold text-white text-center",
            compact ? "min-w-[16px] text-sm" : "min-w-[24px]",
          )}
        >
          {qty}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(id, 1);
          }}
          className={cn(
            "rounded bg-accent-cyan hover:bg-cyan-400 text-brand-deep flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(0,240,255,0.3)]",
            compact ? "size-6" : "size-8",
          )}
        >
          <span className="material-symbols-outlined text-sm font-bold">
            add
          </span>
        </button>
      </div>
    );
  };

  const renderProductRow = (product: TicketProduct) => {
    const hasVariants = !!product.variants;
    const isExpanded = expandedProducts[product.id];
    const localized = localizeProduct(locale, product);

    // Calculate total quantity for this product (sum of variants if any)
    const totalQty = hasVariants
      ? product.variants!.reduce((sum, v) => sum + (cart[v.id] || 0), 0)
      : cart[product.id] || 0;

    return (
      <div
        key={product.id}
        className={cn(
          "flex flex-col rounded-xl border transition-all duration-200 overflow-hidden",
          totalQty > 0 || isExpanded
            ? "bg-brand-surface border-accent-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]"
            : "bg-brand-surface/30 border-white/5 hover:border-white/10",
        )}
      >
        {/* Main Row */}
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer",
            hasVariants && "hover:bg-white/5",
          )}
          onClick={() => hasVariants && toggleExpand(product.id)}
        >
          <div className="flex flex-col gap-1 mb-4 sm:mb-0">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-lg">
                {localized.name}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-brand-text uppercase tracking-wider">
                {localized.durationLabel}
              </span>
            </div>
            {localized.description && (
              <p className="text-sm text-brand-text/70">
                {localized.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 sm:hidden flex-wrap">
              <span className="text-accent-cyan font-bold">
                {hasVariants
                  ? `${t(locale, "de la", "from")} ${Math.min(...product.variants!.map((v) => v.price))} RON`
                  : `${product.price} RON`}
              </span>

              {/* Fan Pit availability quick hint for 1-day */}
              {product.category === "general" && product.id === "gen-1day" && (
                <span className="text-[11px] text-brand-text/70">
                  {isLoadingAvailability
                    ? t(locale, "Se verifică disponibilitatea…", "Checking availability…")
                    : Object.keys(fanPitAvailability).length
                      ? t(locale, "Disponibilitate pe zile mai jos", "Availability by day below")
                      : ""}
                </span>
              )}
              {product.category === "general" && (product.id === "gen-2day" || product.id === "gen-3day" || product.id === "gen-4day") && (() => {
                const days = mapCartIdToDayCodes(product.id);
                const text = formatPackAvailability(days);
                if (!text) return null;
                return (
                  <span className="text-[11px] text-brand-text/70">
                    · {text}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6">
            <span className="hidden sm:block text-accent-cyan font-bold text-lg">
              {hasVariants
                ? `${t(locale, "de la", "from")} ${Math.min(...product.variants!.map((v) => v.price))} RON`
                : `${product.price} RON`}
            </span>
            {product.category === "general" && (product.id === "gen-2day" || product.id === "gen-3day" || product.id === "gen-4day") && (() => {
              const days = mapCartIdToDayCodes(product.id);
              const text = formatPackAvailability(days);
              if (!text) return null;
              return (
                <span className="hidden sm:block text-[12px] text-brand-text/70">
                  {text}
                </span>
              );
            })()}

            {hasVariants ? (
              <div className="flex items-center gap-2">
                {totalQty > 0 && (
                  <span className="bg-accent-cyan text-brand-deep text-xs font-bold px-2 py-1 rounded-full">
                    {totalQty} {t(locale, "selectate", "selected")}
                  </span>
                )}
                <span
                  className={cn(
                    "material-symbols-outlined text-accent-cyan transition-transform duration-300",
                    isExpanded && "rotate-180",
                  )}
                >
                  expand_more
                </span>
              </div>
            ) : (
              renderQuantityControls(product.id, product.price)
            )}
          </div>
        </div>

        {/* Variants Section */}
        {hasVariants && (
          <div
            className={cn(
              "bg-black/20 border-t border-white/5 transition-all duration-300 ease-in-out overflow-hidden",
              isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="p-4 grid gap-3">
              <p className="text-sm text-brand-text mb-1 font-medium">
                {t(locale, "Selectează perioada:", "Select period:")}
                {product.category === "general" && product.id === "gen-1day" && Object.keys(fanPitAvailability).length > 0 ? (
                  <span className="ml-2 text-xs font-normal text-brand-text/70">
                    <span>
                      {t(locale, "(rămase:", "(remaining:")} {dayLabel(locale, "fri")} {fanPitAvailability.fri ?? "—"}, {dayLabel(locale, "sat")} {fanPitAvailability.sat ?? "—"}, {dayLabel(locale, "sun")} {fanPitAvailability.sun ?? "—"}, {dayLabel(locale, "mon")} {fanPitAvailability.mon ?? "—"})
                    </span>
                  </span>
                ) : null}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.variants!.map((variant) => (
                  <div
                    key={variant.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      (cart[variant.id] || 0) > 0
                        ? "bg-accent-cyan/10 border-accent-cyan/50"
                        : "bg-white/5 border-white/5 hover:bg-white/10",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">
                        {localizeVariantLabel(locale, variant.id, variant.label)}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-accent-cyan text-xs font-bold">
                          {variant.price} RON
                        </span>

                        {/* Fan Pit (general) availability per day - shown only for 1-day variants */}
                        {product.category === "general" && product.id === "gen-1day" && (() => {
                          const day = dayFromVariantId(variant.id);
                          if (!day) return null;
                          const text = formatAvailability(day);
                          if (!text) return null;
                          return (
                            <span className="text-[11px] font-semibold text-brand-text/70">
                              · {text}
                            </span>
                          );
                        })()}
                        {product.category === "general" && product.id === "gen-2day" && (() => {
                          const days = mapCartIdToDayCodes(variant.id);
                          const text = formatPackAvailability(days);
                          if (!text) return null;
                          return (
                            <span className="text-[11px] font-semibold text-brand-text/70">
                              · {text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    {renderQuantityControls(variant.id, variant.price, true)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-brand-deep min-h-screen flex flex-col font-manrope text-slate-100 overflow-x-hidden selection:bg-accent-cyan selection:text-brand-deep">
      <main className="flex-grow w-full max-w-[1440px] mx-auto p-4 lg:p-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-brand-surface/30 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-accent-cyan/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        {/* Progress (3 steps) */}
        <div className="max-w-[1440px] mx-auto w-full mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-white text-base font-medium leading-normal">
                {t(locale, "Progres Rezervare", "Booking Progress")}
              </p>
              <p className="text-accent-cyan/80 text-sm font-normal leading-normal">
                {t(locale, "Pasul 1 din 3", "Step 1 of 3")}
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-accent-gold to-accent-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                style={{ width: "33.33%" }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 w-full lg:w-[65%] flex flex-col gap-10">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em] text-white">
                {t(locale, "Configurator Bilete", "Ticket Builder")}
              </h1>
              <p className="text-brand-text text-base font-medium">
                {t(locale, "Alege biletele dorite pentru Banaton Fest 2026.", "Choose your Banaton Fest 2026 tickets.")}
              </p>
            </div>

            {/* Fan Pit Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-brand-surface border border-white/10 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white">
                    confirmation_number
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Fan Pit
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {PRODUCTS.filter((p) => p.category === "general").map(
                  renderProductRow,
                )}
              </div>
            </section>

            {/* VIP Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-brand-surface border border-accent-gold/30 flex items-center justify-center shadow-lg shadow-accent-gold/10">
                  <span className="material-symbols-outlined text-accent-gold">
                    star
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {t(locale, "Acces VIP", "VIP Access")}
                </h2>
              </div>
              <p className="text-sm text-brand-text/70">
                {t(locale, "Selecția mesei se face după apăsarea butonului de continuare.", "Table selection happens after you continue.")}
              </p>
              <div className="flex flex-col gap-4">
                {PRODUCTS.filter((p) => p.category === "vip").map(
                  renderProductRow,
                )}
              </div>
            </section>

            <div className="p-4 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-accent-gold mt-0.5">
                info
              </span>
              <div>
                <p className="text-sm font-medium text-accent-gold mb-1">
                  {t(locale, "Informație importantă", "Important")}
                </p>
                <p className="text-sm text-brand-text">
                  {t(locale, "Copiii sub 12 ani au acces gratuit însoțiți de un adult plătitor.", "Children under 12 enter for free when accompanied by a paying adult.")}
                </p>
              </div>
            </div>

            {hasVipInCart && (
              <div className="p-4 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-accent-cyan mt-0.5">
                  table_restaurant
                </span>
                <div>
                <p className="text-sm font-medium text-accent-cyan mb-1">
                  {t(locale, "Bilete VIP în coș", "VIP tickets in cart")}
                </p>
                <p className="text-sm text-brand-text">
                  {t(locale, "La continuare vei fi redirecționat către pagina de selectare a locurilor VIP, unde aloci biletele VIP pe mese înainte de checkout.", "Next, you will be redirected to the VIP tables page, where you assign your VIP tickets to a table before checkout.")}
                </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <aside className="w-full lg:w-[35%] relative">
            <div className="sticky top-24 flex flex-col gap-4">
              <div className="bg-brand-surface rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col h-auto backdrop-blur-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-accent-cyan">
                    receipt_long
                  </span>
                  {t(locale, "Sumar Comandă", "Order Summary")}
                </h3>

                <div className="flex flex-col gap-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {totalItems === 0 ? (
                    <div className="text-center py-8 text-brand-text/50 border-2 border-dashed border-white/5 rounded-xl">
                      <span className="material-symbols-outlined text-4xl mb-2">
                        shopping_cart_off
                      </span>
                      <p className="text-sm">{t(locale, "Coșul tău este gol", "Your cart is empty")}</p>
                    </div>
                  ) : (
                    Object.entries(cart).map(([id, qty]) => {
                      const product = getProductDetails(id);
                      if (!product) return null;
                      return (
                        <div
                          key={id}
                          className="flex flex-col gap-2 pb-4 border-b border-white/10 border-dashed last:border-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-accent-cyan text-brand-deep text-[10px] font-bold px-1.5 rounded">
                                  {qty}x
                                </span>
                                <p className="text-xs text-brand-text uppercase font-semibold">
                                  {product.category === "vip"
                                    ? "VIP"
                                    : "Fan Pit"}
                                </p>
                              </div>
                              <p className="font-bold text-white text-sm">
                                {localizeProduct(locale, product).name}
                              </p>
                              {product.variantLabel && (
                                <p className="text-xs text-accent-cyan mt-0.5">
                                  {localizeVariantLabel(locale, product.id, product.variantLabel)}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-accent-cyan font-bold">
                                {product.price * qty} RON
                              </p>
                              <p className="text-[10px] text-brand-text">
                                {product.price} x {qty}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>


                {submitError && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {submitError}
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-white/10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-brand-text font-medium">
                      {t(locale, "Subtotal", "Subtotal")}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {totalAmount} RON
                    </span>
                  </div>
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-brand-text font-medium text-lg">
                      {t(locale, "Total de plată", "Total")}
                    </span>
                    <span className="text-3xl font-black text-accent-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                      {totalAmount} RON
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={totalItems <= 0 || isSubmitting}
                    className={cn(
                      "w-full group font-bold text-lg py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2",
                      totalItems > 0 && !isSubmitting
                        ? "bg-gradient-to-r from-accent-cyan to-cyan-400 hover:to-cyan-300 text-brand-deep hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-white/10 text-white/30 cursor-not-allowed shadow-none",
                    )}
                  >
                    {isSubmitting
                      ? t(locale, "Se salvează...", "Saving...")
                      : hasVipInCart
                        ? t(locale, "Alege masa VIP", "Choose VIP table")
                        : t(locale, "Pasul Următor", "Next step")}
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">
                      arrow_forward
                    </span>
                  </button>
                  <p className="text-center text-xs text-brand-text/60 mt-4">
                    {t(locale, "După finalizarea plății vei primi biletele pe email.", "After payment, you will receive your tickets by email.")}
                  </p>
                </div>
              </div>

              <div className="bg-brand-surface/30 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="size-10 rounded-full bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shrink-0">
                  <span className="material-symbols-outlined">
                    support_agent
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Ai nevoie de ajutor?</p>
                  <p className="text-xs text-brand-text/70 mt-1">
                    Scrie-ne la adresa de mai jos și revenim cât mai rapid.
                  </p>
                  <a
                    className="mt-2 inline-block text-xs text-accent-cyan font-medium hover:underline hover:text-cyan-300 transition-colors"
                    href="mailto:office.banaton@gmail.com"
                  >
                    office.banaton@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
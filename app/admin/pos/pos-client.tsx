"use client";

import { useEffect, useMemo, useState } from "react";

type DayKeyUpper = "FRI" | "SAT" | "SUN" | "MON";

type ProductKey =
  | "GEN_1DAY"
  | "GEN_2DAY"
  | "GEN_3DAY"
  | "GEN_4DAY"
  | "VIP_1DAY"
  | "VIP_4DAY";

type PosLine = {
  id: string;
  productCode: ProductKey;
  qty: number;
  // day selection
  dayCodes: DayKeyUpper[];
};

type CreateResponse =
  | {
      ok: true;
      order: {
        id: string;
        public_token: string;
        status: string;
        payment_status: string;
        currency: string;
        subtotal_ron: number;
        total_ron: number;
        customer_email: string | null;
        customer_phone: string | null;
      };
      issued_tickets: { issued: boolean; count: number };
      links: { successUrl: string; pdfUrl: string };
      emailed: boolean;
    }
  | { ok: false; error: { message: string } };



type VipAvailabilityResponse = {
  ok?: boolean;
  days?: string[];
  tables?: Array<{
    id?: string;
    label?: string;
    capacity?: number;
    remainingMin?: number;
    remainingByDay?: Record<string, number>;
  }>;
  error?: { message?: string };
};

type DayKeyLower = "fri" | "sat" | "sun" | "mon";

const DAYS: Array<{
  key: DayKeyUpper;
  labelRo: string;
  dateShort: string; // for foreigners
}> = [
  { key: "FRI", labelRo: "Vineri", dateShort: "29.05" },
  { key: "SAT", labelRo: "Sâmbătă", dateShort: "30.05" },
  { key: "SUN", labelRo: "Duminică", dateShort: "31.05" },
  { key: "MON", labelRo: "Luni", dateShort: "01.06" },
];

const DAY_UP_TO_LOW: Record<DayKeyUpper, DayKeyLower> = {
  FRI: "fri",
  SAT: "sat",
  SUN: "sun",
  MON: "mon",
};

const ALL_DAYS_LOW: DayKeyLower[] = ["fri", "sat", "sun", "mon"];

const PRODUCTS: Array<{
  code: ProductKey;
  title: string;
  subtitle: string;
  requiresDays: "none" | "pick1" | "pick2" | "fixed3";
  allowedDays?: DayKeyUpper[]; // for pick2
  fixedDays?: DayKeyUpper[];
}> = [
  {
    code: "GEN_1DAY",
    title: "Fan Pit — 1 zi",
    subtitle: "Alegi o zi",
    requiresDays: "pick1",
  },
  {
    code: "GEN_2DAY",
    title: "Fan Pit — 2 zile",
    subtitle: "Alegi 2 zile dintre Vineri / Duminică / Luni",
    requiresDays: "pick2",
    allowedDays: ["FRI", "SUN", "MON"],
  },
  {
    code: "GEN_3DAY",
    title: "Fan Pit — 3 zile",
    subtitle: "Pachet Vineri + Duminică + Luni",
    requiresDays: "fixed3",
    fixedDays: ["FRI", "SUN", "MON"],
  },
  {
    code: "GEN_4DAY",
    title: "Fan Pit — 4 zile",
    subtitle: "Acces complet 4 zile",
    requiresDays: "none",
  },
  {
    code: "VIP_1DAY",
    title: "VIP — 1 zi",
    subtitle: "Alegi o zi (masa se alocă separat din flow-ul VIP)",
    requiresDays: "pick1",
  },
  {
    code: "VIP_4DAY",
    title: "VIP — 4 zile",
    subtitle: "VIP complet 4 zile (masa se alocă separat din flow-ul VIP)",
    requiresDays: "none",
  },
];

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toInt(v: unknown, fallback = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function productMeta(code: ProductKey) {
  return PRODUCTS.find((p) => p.code === code)!;
}

function canonicalDaySetForLine(line: PosLine): string {
  const meta = productMeta(line.productCode);

  if (meta.requiresDays === "none") return ""; // matches your DB pricing for 4-day
  if (meta.requiresDays === "fixed3") return (meta.fixedDays || []).join(",");

  // pick1/pick2 => use selected
  return Array.from(new Set(line.dayCodes)).join(",");
}

function variantLabelForLine(line: PosLine): string | null {
  const meta = productMeta(line.productCode);
  if (meta.requiresDays === "none")
    return meta.code.includes("4DAY") ? "4 zile" : null;
  if (meta.requiresDays === "fixed3") return "3 zile";
  if (meta.requiresDays === "pick2") return "2 zile";
  if (meta.requiresDays === "pick1") {
    const d = line.dayCodes[0];
    const label = DAYS.find((x) => x.key === d)?.labelRo;
    return label ? `1 zi · ${label}` : "1 zi";
  }
  return null;
}

function validateLine(line: PosLine): string | null {
  const meta = productMeta(line.productCode);
  const qty = Math.max(1, toInt(line.qty, 1));

  if (qty <= 0) return "Cantitatea trebuie să fie minim 1.";

  if (meta.requiresDays === "none") return null;

  if (meta.requiresDays === "fixed3") return null;

  if (meta.requiresDays === "pick1") {
    if (line.dayCodes.length !== 1) return "Alege exact 1 zi.";
    return null;
  }

  if (meta.requiresDays === "pick2") {
    const allowed = new Set(meta.allowedDays || []);
    const picked = line.dayCodes.filter((d) => allowed.has(d));
    if (picked.length !== 2)
      return "Alege exact 2 zile (Vineri / Duminică / Luni).";
    // ensure no SAT
    if (line.dayCodes.some((d) => d === "SAT"))
      return "Sâmbăta nu este disponibilă pentru pachetul de 2 zile.";
    return null;
  }

  return null;
}

export default function PosClient() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  const [lines, setLines] = useState<PosLine[]>([
    {
      id: uid(),
      productCode: "GEN_1DAY",
      qty: 1,
      dayCodes: ["FRI"],
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<Extract<
    CreateResponse,
    { ok: true }
  > | null>(null);

  // --- VIP allocation (same flow as /vip) ---
  const [vipActiveZone, setVipActiveZone] = useState<string | null>(null);
  const [vipSelectedTable, setVipSelectedTable] = useState<string | null>(null);

  const [vipAvailabilityByLabel, setVipAvailabilityByLabel] = useState<Record<string, number>>({});
  const [vipAvailLoading, setVipAvailLoading] = useState(false);

  const vipQty = useMemo(() => {
    return lines
      .filter((l) => l.productCode.startsWith("VIP"))
      .reduce((sum, l) => sum + Math.max(1, toInt(l.qty, 1)), 0);
  }, [lines]);

  const vipDaysUpper = useMemo(() => {
    const set = new Set<DayKeyUpper>();
    for (const l of lines) {
      if (!l.productCode.startsWith("VIP")) continue;
      // VIP_4DAY has no day selection in POS UI; for allocation treat as all days.
      if ((l.dayCodes || []).length === 0) {
        for (const d of DAYS) set.add(d.key);
      } else {
        for (const d of l.dayCodes) set.add(d);
      }
    }
    return Array.from(set);
  }, [lines]);

  const vipDaysLow = useMemo(() => {
    const out = vipDaysUpper.map((d) => DAY_UP_TO_LOW[d]).filter(Boolean);
    return out.length ? (Array.from(new Set(out)) as DayKeyLower[]) : [];
  }, [vipDaysUpper]);

  async function refreshVipAvailability(days: DayKeyLower[]) {
    if (!days.length) {
      setVipAvailabilityByLabel({});
      return;
    }

    setVipAvailLoading(true);
    try {
      const res = await fetch(
        `/api/vip/availability?days=${encodeURIComponent(days.join(","))}&includeHolds=true`,
        { cache: "no-store" },
      );

      const json = (await res.json().catch(() => ({}))) as VipAvailabilityResponse;

      if (!res.ok || !json?.ok) {
        console.warn("[pos] vip availability failed", { status: res.status, json });
        setVipAvailabilityByLabel({});
        return;
      }

      const map: Record<string, number> = {};
      for (const t of json.tables || []) {
        if (t?.label) map[String(t.label)] = toInt(t.remainingMin, 0);
      }
      setVipAvailabilityByLabel(map);
    } catch (e) {
      console.warn("[pos] vip availability exception", e);
      setVipAvailabilityByLabel({});
    } finally {
      setVipAvailLoading(false);
    }
  }

  const vipSeatsRequired = Math.max(0, vipQty);
  const vipSeatsAvailableForSelected = vipSelectedTable
    ? (vipAvailabilityByLabel[vipSelectedTable] ?? 6)
    : 0;


  const anyVip = useMemo(
    () => lines.some((l) => l.productCode.startsWith("VIP")),
    [lines],
  );

  const formValid = useMemo(() => {
    // If sendEmail is enabled, email must be valid
    if (sendEmail) {
      if (!email.trim()) return false;
      if (!isEmail(email.trim())) return false;
    }

    // phone optional but recommended
    // Validate all lines
    for (const l of lines) {
      if (validateLine(l)) return false;
    }
    if (anyVip) {
      if (!vipSelectedTable) return false;
      if (vipSeatsRequired <= 0) return false;
      // current implementation supports one table (capacity 6)
      if (vipSeatsRequired > 6) return false;
      // best-effort client-side availability guard
      if (vipSeatsAvailableForSelected > 0 && vipSeatsRequired > vipSeatsAvailableForSelected) return false;
    }
    return lines.length > 0;
  }, [sendEmail, email, lines, anyVip, vipSelectedTable, vipSeatsRequired, vipSeatsAvailableForSelected]);

  useEffect(() => {
    if (!anyVip) {
      setVipSelectedTable(null);
      setVipActiveZone(null);
      return;
    }

    if (vipDaysLow.length) {
      void refreshVipAvailability(vipDaysLow);
    }
  }, [anyVip, vipDaysLow.join(",")]);

  useEffect(() => {
    if (!anyVip) return;
    if (!vipDaysLow.length) return;

    const id = window.setInterval(() => {
      void refreshVipAvailability(vipDaysLow);
    }, 15000);

    return () => window.clearInterval(id);
  }, [anyVip, vipDaysLow.join(",")]);

  function updateLine(id: string, patch: Partial<PosLine>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;

        let next: PosLine = { ...l, ...patch };

        // Auto-fix days if product changes
        const meta = productMeta(next.productCode);

        if (meta.requiresDays === "none") next.dayCodes = [];
        if (meta.requiresDays === "fixed3")
          next.dayCodes = meta.fixedDays || ["FRI", "SUN", "MON"];
        if (meta.requiresDays === "pick1") {
          if (next.dayCodes.length !== 1) next.dayCodes = ["FRI"];
        }
        if (meta.requiresDays === "pick2") {
          const allowed = meta.allowedDays || ["FRI", "SUN", "MON"];
          const filtered = next.dayCodes.filter((d) => allowed.includes(d));
          const unique = Array.from(new Set(filtered));
          next.dayCodes = unique.slice(0, 2);
        }

        // Clamp qty
        next.qty = Math.max(1, toInt(next.qty, 1));

        return next;
      }),
    );
  }

  function toggleDay(id: string, day: DayKeyUpper) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;

        const meta = productMeta(l.productCode);
        const set = new Set(l.dayCodes);

        if (meta.requiresDays === "none" || meta.requiresDays === "fixed3")
          return l;

        if (meta.requiresDays === "pick1") {
          // pick exactly 1 => replace
          return { ...l, dayCodes: [day] };
        }

        if (meta.requiresDays === "pick2") {
          // only allow FRI/SUN/MON
          const allowed = new Set(meta.allowedDays || ["FRI", "SUN", "MON"]);
          if (!allowed.has(day)) return l;

          if (set.has(day)) set.delete(day);
          else set.add(day);

          const next = Array.from(set);
          // enforce max 2
          return { ...l, dayCodes: next.slice(0, 2) };
        }

        return l;
      }),
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        productCode: "GEN_1DAY",
        qty: 1,
        dayCodes: ["FRI"],
      },
    ]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function submit() {
    if (!formValid || submitting) return;

    if (anyVip && !vipSelectedTable) {
      setError("Selectează o masă VIP înainte de a genera biletele.");
      return;
    }
    if (anyVip && vipSeatsRequired > 6) {
      setError("Comanda are mai mult de 6 locuri VIP. Pentru moment, POS suportă o singură masă (max 6). Împarte în mai multe comenzi.");
      return;
    }
    if (anyVip && vipSelectedTable && vipSeatsAvailableForSelected > 0 && vipSeatsRequired > vipSeatsAvailableForSelected) {
      setError("Masa selectată nu are suficiente locuri libere pentru zilele VIP. Alege altă masă.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        customer: {
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
        sendEmail,
        items: lines.map((l) => ({
          productCode: l.productCode,
          qty: l.qty,
          dayCodes: l.dayCodes, // already upper (FRI etc)
          canonicalDaySet: canonicalDaySetForLine(l),
          variantLabelSnapshot: variantLabelForLine(l),
        })),
        vip: anyVip && vipSelectedTable ? { tableLabel: vipSelectedTable } : undefined,
      };

      const res = await fetch("/api/admin/pos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as CreateResponse;

      if (!res.ok || !json.ok) {
        throw new Error(
          (json as any)?.error?.message || "A apărut o eroare la generare.",
        );
      }

      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- VIP UI components ---
  const VipTableSelectorModal = ({
    zoneId,
    onClose,
  }: {
    zoneId: string;
    onClose: () => void;
  }) => {
    const [start, end] = zoneId.split("-").map(Number);
    const tables = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="bg-[#1A0B2E] border border-[#4C2A85] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(127,19,236,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#4C2A85] flex justify-between items-center bg-[#241242]">
            <div>
              <h3 className="text-white text-xl font-bold">Alege Masa</h3>
              <p className="text-indigo-300 text-sm">Zona {zoneId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-300 hover:text-white transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto bg-[#130026]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {tables.map((num) => {
                const tableLabel = `Masa ${num}`;
                const isSelected = vipSelectedTable === tableLabel;

                const emptySeats = vipAvailabilityByLabel[tableLabel] ?? 6;
                const canFit = vipSeatsRequired > 0 && vipSeatsRequired <= emptySeats;

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (!canFit) return;
                      setVipSelectedTable(tableLabel);
                      setVipActiveZone(null);
                    }}
                    className={cn(
                      "rounded-xl p-3 min-h-[92px] flex flex-col items-center justify-center text-center transition-all border-2",
                      !canFit
                        ? "bg-[#1b1430] border-[#3a285e] text-indigo-300 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-[#00E5FF]/10 border-[#00E5FF] text-white shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                          : "bg-[#241242] border-[#4C2A85] text-white hover:border-[#FFD700] hover:bg-[#2D1B4E]",
                    )}
                  >
                    <span className={cn("text-base font-black leading-none", isSelected ? "text-[#00E5FF]" : "text-white")}>
                      Masa {num}
                    </span>
                    <span className="mt-2 text-[11px] leading-tight text-indigo-200">
                      Locuri libere: <span className="font-bold text-white">{emptySeats}</span>
                    </span>
                    <span className={cn("mt-1 text-[10px] font-semibold", canFit ? "text-[#00E5FF]" : "text-rose-300")}>
                      {canFit ? `Potrivită pentru ${vipSeatsRequired} VIP` : `Nu încape (${vipSeatsRequired})`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-[#4C2A85] bg-[#1A0B2E] text-center">
            <p className="text-xs text-indigo-300">
              Toate mesele au capacitate de 6 persoane.
              {vipAvailLoading ? " (se actualizează...)" : ""}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const VipZoneCircle = ({
    id,
    label,
    onClick,
  }: {
    id: string;
    label: string;
    onClick: () => void;
  }) => {
    const [start, end] = id.split("-").map(Number);
    let isZoneSelected = false;
    if (vipSelectedTable) {
      const tableNum = parseInt(vipSelectedTable.replace("Masa ", ""));
      if (tableNum >= start && tableNum <= end) isZoneSelected = true;
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative size-28 sm:size-32 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
          isZoneSelected
            ? "bg-[#00E5FF] border-[#00E5FF] text-[#130026] shadow-[0_0_30px_rgba(0,229,255,0.6)] scale-105"
            : "bg-[#1A0B2E] border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]",
        )}
      >
        <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Mese</span>
        <span className="text-xl sm:text-2xl font-black">{label}</span>
        {isZoneSelected && (
          <div className="absolute -top-2 -right-2 bg-white text-[#130026] size-6 flex items-center justify-center rounded-full border-2 border-[#130026] shadow-lg">
            <span className="material-symbols-outlined text-sm font-bold">check</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F0518] text-slate-100">
      {vipActiveZone ? (
        <VipTableSelectorModal
          zoneId={vipActiveZone}
          onClose={() => setVipActiveZone(null)}
        />
      ) : null}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              POS — Vânzare fizică (cash)
            </h1>
            <p className="mt-1 text-sm text-indigo-200">
              Generează bilete și PDF pentru print, cu opțiune de trimitere pe
              email.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-8 space-y-6">
            {/* Customer */}
            <section className="rounded-2xl border border-[#432C7A] bg-[#1A0B2E]/70 backdrop-blur p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">Client</h2>

                <label className="inline-flex items-center gap-2 text-xs text-indigo-200">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4 accent-[#00E5FF]"
                  />
                  Trimite biletele pe email (o singură dată)
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-indigo-200">
                    Email{" "}
                    {sendEmail ? (
                      <span className="text-rose-300">*</span>
                    ) : (
                      "(opțional)"
                    )}
                  </span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@email.com"
                    className={cn(
                      "mt-1 h-11 w-full rounded-xl bg-[#24123E] border px-3 text-white placeholder:text-indigo-300/50 outline-none",
                      sendEmail && (!email.trim() || !isEmail(email.trim()))
                        ? "border-rose-400/50 focus:border-rose-300"
                        : "border-[#432C7A] focus:border-[#00E5FF]/60",
                    )}
                    type="email"
                  />
                  {sendEmail && email.trim() && !isEmail(email.trim()) ? (
                    <p className="mt-1 text-xs text-rose-200">Email invalid.</p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-indigo-200">
                    Telefon (opțional)
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07xx xxx xxx"
                    className="mt-1 h-11 w-full rounded-xl bg-[#24123E] border border-[#432C7A] px-3 text-white placeholder:text-indigo-300/50 outline-none focus:border-[#00E5FF]/60"
                    type="tel"
                  />
                </label>
              </div>

              {anyVip ? (
                <div className="mt-4 rounded-2xl border border-[#FFD700]/25 bg-[#FFD700]/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-bold text-sm">Alocare masă VIP (obligatoriu)</p>
                      <p className="text-[#B39DDB] text-xs mt-1">
                        Pentru biletele VIP trebuie să alegi o masă înainte de a genera biletele.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshVipAvailability(vipDaysLow)}
                      disabled={vipAvailLoading}
                      className={cn(
                        "h-9 px-3 rounded-xl border text-xs font-bold transition-colors",
                        vipAvailLoading
                          ? "border-[#432C7A] bg-[#24123E]/60 text-indigo-200 cursor-wait"
                          : "border-[#432C7A] bg-[#24123E] text-white hover:border-[#00E5FF]/50 hover:text-[#00E5FF]",
                      )}
                      title="Reîncarcă disponibilitatea"
                    >
                      {vipAvailLoading ? "Se actualizează..." : "Refresh"}
                    </button>
                  </div>

                  {vipSeatsRequired > 6 ? (
                    <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                      Comanda are {vipSeatsRequired} locuri VIP. Un singur tabel are max 6 locuri.
                      Împarte biletele VIP în mai multe comenzi.
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <VipZoneCircle id="1-25" label="1-25" onClick={() => setVipActiveZone("1-25")} />
                    <VipZoneCircle id="26-50" label="26-50" onClick={() => setVipActiveZone("26-50")} />
                    <VipZoneCircle id="51-75" label="51-75" onClick={() => setVipActiveZone("51-75")} />
                    <VipZoneCircle id="76-100" label="76-100" onClick={() => setVipActiveZone("76-100")} />
                    <VipZoneCircle id="101-125" label="101-125" onClick={() => setVipActiveZone("101-125")} />
                    <VipZoneCircle id="126-150" label="126-150" onClick={() => setVipActiveZone("126-150")} />
                    <VipZoneCircle id="151-175" label="151-175" onClick={() => setVipActiveZone("151-175")} />
                    <VipZoneCircle id="176-200" label="176-200" onClick={() => setVipActiveZone("176-200")} />
                  </div>

                  <div className="mt-4 rounded-xl border border-[#432C7A] bg-[#24123E]/60 p-3 text-sm text-indigo-100">
                    <p>
                      Locuri VIP în comandă: <span className="font-bold text-white">{vipSeatsRequired}</span>
                    </p>
                    <p className="mt-1">
                      Masă selectată: <span className="font-bold text-white">{vipSelectedTable || "—"}</span>
                    </p>
                    {vipSelectedTable ? (
                      <p className="mt-1">
                        Locuri libere (min pe zile): <span className="font-bold text-white">{vipSeatsAvailableForSelected}</span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-indigo-200">
                      Zile VIP: <span className="font-semibold text-white">{vipDaysUpper.join(", ") || "—"}</span>
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-indigo-200">
                    Masa se rezervă automat la generare (în `/api/admin/pos/create`).
                  </p>
                </div>
              ) : null}
            </section>

            {/* Lines */}
            <section className="rounded-2xl border border-[#432C7A] bg-[#1A0B2E]/70 backdrop-blur p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">Produse</h2>
                <button
                  type="button"
                  onClick={addLine}
                  className="h-10 px-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white font-bold text-sm hover:border-[#00E5FF]/50 hover:text-[#00E5FF] transition-colors"
                >
                  + Adaugă linie
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {lines.map((line, idx) => {
                  const meta = productMeta(line.productCode);
                  const err = validateLine(line);

                  return (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-[#432C7A] bg-[#24123E]/50 p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/25 flex items-center justify-center text-[#00E5FF] font-black">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-white font-bold">{meta.title}</p>
                            <p className="text-xs text-indigo-200">
                              {meta.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="h-9 px-3 rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-200 text-sm font-bold hover:bg-rose-500/15"
                            disabled={lines.length <= 1}
                            title={
                              lines.length <= 1
                                ? "Trebuie minim 1 linie"
                                : "Șterge linie"
                            }
                          >
                            Șterge
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-8">
                          <label className="block">
                            <span className="text-xs font-semibold text-indigo-200">
                              Tip bilet
                            </span>
                            <select
                              value={line.productCode}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  productCode: e.target.value as ProductKey,
                                })
                              }
                              className="mt-1 h-11 w-full rounded-xl bg-[#1A0B2E] border border-[#432C7A] px-3 text-white outline-none focus:border-[#00E5FF]/60"
                            >
                              {PRODUCTS.map((p) => (
                                <option key={p.code} value={p.code}>
                                  {p.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block">
                            <span className="text-xs font-semibold text-indigo-200">
                              Cantitate
                            </span>
                            <input
                              value={line.qty}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  qty: Math.max(1, toInt(e.target.value, 1)),
                                })
                              }
                              className="mt-1 h-11 w-full rounded-xl bg-[#1A0B2E] border border-[#432C7A] px-3 text-white outline-none focus:border-[#00E5FF]/60"
                              type="number"
                              min={1}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Days */}
                      {meta.requiresDays !== "none" ? (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-indigo-200 mb-2">
                            Zile (cu date):{" "}
                            <span className="text-indigo-300 font-normal">
                              {meta.requiresDays === "pick1"
                                ? "alege 1"
                                : meta.requiresDays === "pick2"
                                  ? "alege 2"
                                  : "fix (Vineri, Duminică, Luni)"}
                            </span>
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {DAYS.map((d) => {
                              const selected = line.dayCodes.includes(d.key);
                              const disabledByRules =
                                meta.requiresDays === "fixed3"
                                  ? true
                                  : meta.requiresDays === "pick2" &&
                                    !(meta.allowedDays || []).includes(d.key);

                              const fixedSelected =
                                meta.requiresDays === "fixed3" &&
                                (meta.fixedDays || []).includes(d.key);

                              const actualSelected =
                                meta.requiresDays === "fixed3"
                                  ? fixedSelected
                                  : selected;

                              return (
                                <button
                                  key={d.key}
                                  type="button"
                                  onClick={() => toggleDay(line.id, d.key)}
                                  disabled={
                                    disabledByRules ||
                                    meta.requiresDays === "fixed3"
                                  }
                                  className={cn(
                                    "rounded-xl border px-3 py-2 text-left transition-colors",
                                    disabledByRules
                                      ? "border-[#432C7A] bg-[#1A0B2E]/40 text-indigo-300/60 cursor-not-allowed"
                                      : actualSelected
                                        ? "border-[#00E5FF]/60 bg-[#00E5FF]/10 text-white"
                                        : "border-[#432C7A] bg-[#1A0B2E] text-indigo-200 hover:border-[#00E5FF]/50",
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">
                                      {d.labelRo}
                                    </span>
                                    {actualSelected ? (
                                      <span className="text-xs text-[#00E5FF] font-black">
                                        ✓
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-indigo-300">
                                    {d.dateShort}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {meta.requiresDays === "fixed3" ? (
                            <p className="mt-2 text-xs text-indigo-300">
                              Pachet fix:{" "}
                              <span className="font-semibold text-white">
                                FRI, SUN, MON
                              </span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {err ? (
                        <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                          {err}
                        </div>
                      ) : null}

                      <div className="mt-3 text-xs text-indigo-300">
                        canonical_day_set:{" "}
                        <span className="text-white font-semibold">
                          {canonicalDaySetForLine(line) || "(gol / 4 zile)"}
                        </span>
                        {variantLabelForLine(line) ? (
                          <>
                            {" "}
                            · variant:{" "}
                            <span className="text-white font-semibold">
                              {variantLabelForLine(line)}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Submit */}
            <section className="rounded-2xl border border-[#432C7A] bg-[#1A0B2E]/70 backdrop-blur p-5 sm:p-6">
              {error ? (
                <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={submit}
                disabled={!formValid || submitting}
                className={cn(
                  "w-full h-12 rounded-xl font-black transition-all flex items-center justify-center gap-2",
                  formValid && !submitting
                    ? "bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#24123E] shadow-[0_0_20px_rgba(255,215,0,0.22)] hover:shadow-[0_0_30px_rgba(255,215,0,0.35)]"
                    : "bg-[#24123E] border border-[#432C7A] text-indigo-300 cursor-not-allowed",
                )}
              >
                <span className="material-symbols-outlined">
                  {submitting ? "progress_activity" : "confirmation_number"}
                </span>
                {submitting ? "Se generează..." : "Generează biletele"}
              </button>

              <p className="mt-3 text-xs text-indigo-200">
                Dacă nu vrei email, debifează opțiunea și tipărește direct
                PDF-ul.
              </p>
            </section>
          </div>

          {/* Right */}
          <div className="lg:col-span-4 space-y-6">
            {/* Result */}
            <section className="rounded-2xl border border-[#432C7A] bg-[#1A0B2E]/70 backdrop-blur p-5 sm:p-6">
              <h2 className="text-lg font-bold text-white">Rezultat</h2>

              {!result ? (
                <div className="mt-3 rounded-xl border border-[#432C7A] bg-[#24123E]/50 p-4 text-sm text-indigo-200">
                  După generare, aici apar linkurile de PDF și confirmare.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-emerald-100">
                    <p className="font-black text-white">Comandă creată ✅</p>
                    <p className="mt-1 text-sm">
                      Tickets:{" "}
                      <span className="font-bold text-white">
                        {result.issued_tickets?.count ?? 0}
                      </span>{" "}
                      · Email:{" "}
                      <span className="font-bold text-white">
                        {result.emailed ? "trimis" : "nu"}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#432C7A] bg-[#24123E]/50 p-4 text-sm text-indigo-200">
                    <p>
                      Total:{" "}
                      <span className="font-bold text-white">
                        {result.order.total_ron} RON
                      </span>
                    </p>
                    <p className="mt-1">
                      Email:{" "}
                      <span className="font-semibold text-white break-words">
                        {result.order.customer_email || "—"}
                      </span>
                    </p>
                    <p className="mt-1">
                      Telefon:{" "}
                      <span className="font-semibold text-white break-words">
                        {result.order.customer_phone || "—"}
                      </span>
                    </p>
                  </div>


                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={result.links.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-11 rounded-xl bg-[#24123E] border border-[#432C7A] text-white font-bold text-sm flex items-center justify-center gap-2 hover:border-[#00E5FF]/50 hover:text-[#00E5FF] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        download
                      </span>
                      Descarcă PDF
                    </a>

                    <a
                      href={result.links.successUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-11 rounded-xl bg-[#24123E] border border-[#432C7A] text-white font-bold text-sm flex items-center justify-center gap-2 hover:border-[#FFD700]/50 hover:text-[#FFD700] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        open_in_new
                      </span>
                      Deschide confirmarea
                    </a>
                  </div>

                  <p className="text-xs text-indigo-200">
                    Dacă email-ul nu ajunge, folosește PDF-ul și/sau admin
                    “force resend”.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

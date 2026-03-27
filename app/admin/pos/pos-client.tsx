"use client";

import { useMemo, useState } from "react";

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
    return lines.length > 0;
  }, [sendEmail, email, lines]);

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

  return (
    <div className="min-h-screen bg-[#0F0518] text-slate-100">
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
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Ai produse VIP. Masa se alocă din flow-ul VIP (pasul VIP) —
                  aici doar vinzi și emiți biletele.
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

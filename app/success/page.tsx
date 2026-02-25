"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  category?: "general" | "vip" | string;
  name?: string;
  label?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  price?: number;
  totalPrice?: number;
  lineTotal?: number;
  line_total?: number;
  durationLabel?: string;
  duration_label?: string;
  variantLabel?: string | null;
  variant_label?: string | null;
};

type PublicOrderResponse = {
  order?: {
    id?: string;
    publicToken?: string;
    public_token?: string;
    status?: string | null;
    paymentStatus?: string | null;
    payment_status?: string | null;
    paymentReference?: string | null;
    payment_reference?: string | null;
    createdAt?: string | null;
    created_at?: string | null;
    currency?: string | null;
    totalAmount?: number;
    total_amount?: number;
    total_ron?: number;
    items?: OrderItem[];
  };
};

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

function formatMoney(value: number, currency = "RON") {
  const safe = Number.isFinite(value) ? value : 0;
  const code = (currency || "RON").toUpperCase();

  if (code === "RON") {
    return `${new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safe)} RON`;
  }

  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)} ${code}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getPaymentBadge(status?: string | null) {
  const s = String(status || "").toLowerCase();
  if (["paid", "succeeded", "completed", "confirmed"].includes(s)) {
    return {
      label: "Plată confirmată",
      tone: "text-emerald-300",
      panel: "border-emerald-400/30 bg-emerald-500/10",
      dot: "bg-emerald-400",
    };
  }

  if (["pending", "processing", "requires_action", "unpaid"].includes(s)) {
    return {
      label: "Așteptăm confirmarea plății",
      tone: "text-amber-200",
      panel: "border-amber-400/30 bg-amber-500/10",
      dot: "bg-amber-300",
    };
  }

  if (["failed", "canceled", "cancelled", "expired"].includes(s)) {
    return {
      label: "Plată neconfirmată",
      tone: "text-red-200",
      panel: "border-red-400/30 bg-red-500/10",
      dot: "bg-red-400",
    };
  }

  return {
    label: "Status necunoscut",
    tone: "text-slate-300",
    panel: "border-white/10 bg-white/5",
    dot: "bg-slate-400",
  };
}

function isPaymentConfirmed(status?: string | null) {
  const s = String(status || "").toLowerCase();
  return ["paid", "succeeded", "completed", "confirmed"].includes(s);
}

export default function Success() {
  const searchParams = useSearchParams();

  const queryOrderToken =
    searchParams?.get("order") || searchParams?.get("token") || null;
  const stripeSessionId = searchParams?.get("session_id") || null;

  const [orderData, setOrderData] = useState<PublicOrderResponse["order"] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function fetchOrder() {
      if (!queryOrderToken) {
        if (!cancelled) {
          setError("Lipsește tokenul comenzii din URL.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/order/public?token=${encodeURIComponent(queryOrderToken)}`,
          {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
        );

        const payload = (await res.json().catch(() => ({}))) as PublicOrderResponse & {
          error?: string;
          message?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error || payload.message || `HTTP ${res.status}`);
        }

        const order = payload.order ?? null;

        if (!cancelled) {
          setOrderData(order);
          setError(null);
        }

        const paymentStatus = order?.paymentStatus ?? order?.payment_status ?? order?.status;
        const confirmed = isPaymentConfirmed(paymentStatus);

        if (!cancelled) {
          setIsPolling(!confirmed);
        }

        return confirmed;
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Nu am putut încărca datele comenzii.",
          );
        }
        return false;
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void (async () => {
      const confirmed = await fetchOrder();

      if (cancelled || confirmed || !queryOrderToken) return;

      intervalId = window.setInterval(async () => {
        const done = await fetchOrder();
        if (done && intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }, 3000);
    })();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [queryOrderToken]);

  const orderItems = useMemo(() => orderData?.items ?? [], [orderData]);

  const displayTotal = useMemo(() => {
    const direct = toNumber(
      orderData?.totalAmount ?? orderData?.total_amount ?? orderData?.total_ron,
    );
    if (direct > 0) return direct;

    return orderItems.reduce((sum, item) => {
      const qty = Math.max(1, toNumber(item.qty ?? item.quantity ?? 1));
      const line = toNumber(item.totalPrice ?? item.lineTotal ?? item.line_total);
      if (line > 0) return sum + line;
      const unit = toNumber(item.unitPrice ?? item.unit_price ?? item.price);
      return sum + qty * unit;
    }, 0);
  }, [orderData, orderItems]);

  const firstItem = orderItems[0] ?? null;
  const paymentStatus =
    orderData?.paymentStatus ?? orderData?.payment_status ?? orderData?.status ?? null;
  const paymentBadge = getPaymentBadge(paymentStatus);
  const confirmed = isPaymentConfirmed(paymentStatus);
  const currency = (orderData?.currency || "RON").toUpperCase();

  return (
    <div className="bg-[#191022] text-slate-100 min-h-screen flex flex-col relative overflow-x-hidden font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#7f13ec]/30 rounded-full blur-[120px] opacity-40 mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30vw] h-[30vw] bg-[#FFD700]/10 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <main className="relative z-10 flex-grow flex items-center justify-center p-4 py-10 md:py-16">
        <div className="w-full max-w-2xl animate-fade-in-up">
          <div className="bg-[#241a30] border border-white/10 rounded-3xl shadow-[0_0_50px_-12px_rgba(127,19,236,0.3)] overflow-hidden relative">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#7f13ec] via-[#00e5ff] to-[#FFD700]"></div>

            <div className="p-8 md:p-12 flex flex-col items-center text-center">
              <div className="mb-6 relative group">
                <div
                  className={`absolute inset-0 rounded-full blur-2xl animate-pulse transition-all duration-500 ${
                    confirmed ? "bg-[#FFD700]/30 group-hover:bg-[#FFD700]/40" : "bg-amber-400/20"
                  }`}
                ></div>
                <div
                  className={`relative size-20 md:size-24 rounded-full flex items-center justify-center shadow-lg border-4 border-[#241a30] ring-2 ${
                    confirmed
                      ? "bg-gradient-to-br from-[#FFD700] to-yellow-600 ring-[#FFD700]/50 shadow-yellow-500/20"
                      : "bg-gradient-to-br from-amber-300 to-amber-600 ring-amber-300/40 shadow-amber-500/20"
                  }`}
                >
                  <span className="material-symbols-outlined text-[#191022] text-[40px] md:text-[48px] font-black">
                    {confirmed ? "check" : "hourglass_top"}
                  </span>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                {confirmed ? "Plată Reușită!" : "Confirmăm plata..."}
              </h1>

              <p className="text-slate-300 text-base md:text-lg max-w-md mb-6 leading-relaxed font-medium">
                {confirmed
                  ? "Tranzacția a fost procesată cu succes. Te așteptăm la Banaton Fest!"
                  : "Stripe a finalizat redirecționarea. Verificăm acum confirmarea plății și actualizăm comanda automat."}
              </p>

              <div className={`w-full rounded-2xl border p-4 mb-8 text-left ${paymentBadge.panel}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${paymentBadge.dot} ${isPolling && !confirmed ? "animate-pulse" : ""}`}></span>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${paymentBadge.tone}`}>{paymentBadge.label}</p>
                    <p className="text-xs text-slate-300/90 mt-1">
                      {stripeSessionId ? `Stripe session: ${stripeSessionId}` : "Așteptăm răspunsul final din sistemul de plată."}
                    </p>
                    {queryOrderToken ? (
                      <p className="text-xs text-slate-400 mt-1 break-all">Comandă: {queryOrderToken}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              {error ? (
                <div className="w-full rounded-2xl border border-red-400/30 bg-red-500/10 p-4 mb-8 text-left text-red-100 text-sm">
                  {error}
                </div>
              ) : null}

              <div className="w-full bg-[#1e1528] border border-white/5 rounded-2xl p-0 mb-10 text-left relative overflow-hidden group shadow-inner">
                <div className="absolute right-0 top-0 w-48 h-48 bg-[#7f13ec]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-white/5 bg-white/[0.02] gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-widest mb-1.5">
                      Număr Comandă
                    </p>
                    <p className="text-white font-mono text-sm md:text-lg tracking-wide break-all">
                      {orderData?.paymentReference || orderData?.payment_reference || orderData?.id || (queryOrderToken ? `#${queryOrderToken}` : "—")}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-widest mb-1.5">
                      Dată
                    </p>
                    <p className="text-slate-300 text-sm font-medium">
                      {formatDate(orderData?.createdAt || orderData?.created_at)}
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  {isLoading ? (
                    <div className="text-slate-300 text-sm">Se încarcă detaliile comenzii...</div>
                  ) : orderItems.length === 0 ? (
                    <div className="text-slate-300 text-sm">
                      Nu există încă detalii de produse disponibile pentru această comandă.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 mb-6">
                        {orderItems.map((item) => {
                          const qty = Math.max(1, toNumber(item.qty ?? item.quantity ?? 1));
                          const unitPrice = toNumber(item.unitPrice ?? item.unit_price ?? item.price);
                          const lineTotal =
                            toNumber(item.totalPrice ?? item.lineTotal ?? item.line_total) ||
                            qty * unitPrice;
                          const itemName = item.name || item.label || "Bilet";
                          const itemType = String(item.category || "general").toLowerCase() === "vip" ? "VIP" : "General";
                          const duration = item.durationLabel || item.duration_label || "";
                          const variant = item.variantLabel || item.variant_label || "";

                          return (
                            <div key={item.id} className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                              <div className="h-12 w-12 shrink-0 rounded-xl bg-[#241a30] border border-white/10 flex items-center justify-center">
                                <span className={`material-symbols-outlined ${itemType === "VIP" ? "text-[#FFD700]" : "text-[#00e5ff]"}`}>
                                  {itemType === "VIP" ? "star" : "confirmation_number"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-white font-bold text-base leading-tight">{itemName}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${itemType === "VIP" ? "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20" : "bg-[#7f13ec]/20 text-[#caa5ff] border-[#7f13ec]/20"}`}>
                                        {itemType}
                                      </span>
                                      {duration ? <span className="text-slate-300 text-xs">{duration}</span> : null}
                                      {variant ? <span className="text-slate-400 text-xs">• {variant}</span> : null}
                                    </div>
                                    <p className="text-slate-400 text-sm mt-1">
                                      {qty} x {formatMoney(unitPrice, currency)}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-white font-bold">{formatMoney(lineTotal, currency)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-dashed border-white/10">
                        <span className="text-slate-400 font-medium">Total {confirmed ? "plătit" : "comandă"}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-black text-white tracking-tight">
                            {formatMoney(displayTotal, currency)}
                          </span>
                          <span className={`text-[10px] uppercase tracking-wider font-bold ${paymentBadge.tone}`}>
                            {paymentBadge.label}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <Link
                  href={queryOrderToken ? `/ticket-view?order=${encodeURIComponent(queryOrderToken)}` : "/ticket-view"}
                  className={`flex-1 min-w-[200px] h-14 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 group ${
                    confirmed
                      ? "bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] hover:to-[#7f13ec] text-white transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#7f13ec]/30"
                      : "bg-[#2a2036] text-slate-400 border border-white/10 pointer-events-none"
                  }`}
                  aria-disabled={!confirmed}
                >
                  <span className="material-symbols-outlined group-hover:animate-bounce">download</span>
                  <span>{confirmed ? "Descarcă Biletele (PDF)" : "Biletele devin disponibile după confirmare"}</span>
                </Link>

                <Link
                  href="/"
                  className="flex-1 min-w-[200px] h-14 bg-transparent hover:bg-white/5 text-white border border-white/20 hover:border-white/40 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">
                    arrow_back
                  </span>
                  <span>Înapoi la Pagina Principală</span>
                </Link>
              </div>
            </div>

            <div className="bg-[#1c1426] p-4 text-center border-t border-white/5">
              <p className="text-slate-500 text-sm">
                Ai nevoie de ajutor?{" "}
                <a
                  className="text-[#00e5ff] hover:text-cyan-300 transition-colors font-medium underline underline-offset-2 decoration-cyan-500/30"
                  href="mailto:suport@banaton.ro"
                >
                  Contactează suportul
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

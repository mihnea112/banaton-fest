"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderPublicItem = {
  id?: string;
  name?: string;
  label?: string;
  qty?: number;
  quantity?: number;
  category?: "general" | "vip" | string;
  unitPrice?: number;
  unit_price?: number;
  price?: number;
  totalPrice?: number;
  lineTotal?: number;
  line_total?: number;
};

type OrderPublicResponse = {
  order?: {
    status?: string | null;
    payment_status?: string | null;
    totalAmount?: number;
    total_amount?: number;
    total_ron?: number;
    currency?: string;
    publicToken?: string;
    public_token?: string;
    items?: OrderPublicItem[];
    order_items?: OrderPublicItem[];
  };
  data?: {
    status?: string | null;
    payment_status?: string | null;
    totalAmount?: number;
    total_amount?: number;
    total_ron?: number;
    currency?: string;
    publicToken?: string;
    public_token?: string;
    items?: OrderPublicItem[];
    order_items?: OrderPublicItem[];
  };
  status?: string | null;
  payment_status?: string | null;
  totalAmount?: number;
  total_amount?: number;
  total_ron?: number;
  currency?: string;
  publicToken?: string;
  public_token?: string;
  items?: OrderPublicItem[];
  order_items?: OrderPublicItem[];
};

type NormalizedOrder = {
  status: string | null;
  paymentStatus: string | null;
  totalAmount: number;
  currency: string;
  publicToken: string | null;
  items: OrderPublicItem[];
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
  const isRon = (currency || "RON").toUpperCase() === "RON";

  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe)} ${isRon ? "lei" : currency}`;
}

function normalizeOrder(payload: OrderPublicResponse): NormalizedOrder | null {
  const candidate = payload?.order ?? payload?.data ?? payload;
  if (!candidate || typeof candidate !== "object") return null;

  const items = Array.isArray(candidate.items)
    ? candidate.items
    : Array.isArray(candidate.order_items)
      ? candidate.order_items
      : [];

  return {
    status: typeof candidate.status === "string" ? candidate.status : null,
    paymentStatus:
      typeof candidate.payment_status === "string"
        ? candidate.payment_status
        : null,
    totalAmount:
      toNumber(candidate.totalAmount) ||
      toNumber(candidate.total_amount) ||
      toNumber(candidate.total_ron),
    currency:
      typeof candidate.currency === "string" && candidate.currency
        ? candidate.currency
        : "RON",
    publicToken:
      (typeof candidate.publicToken === "string" && candidate.publicToken) ||
      (typeof candidate.public_token === "string" && candidate.public_token) ||
      null,
    items,
  };
}

async function fetchOrderPublic(
  token: string,
): Promise<NormalizedOrder | null> {
  const res = await fetch(
    `/api/order/public?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    throw new Error(`Order fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as OrderPublicResponse;
  return normalizeOrder(json);
}

/**
 * Optional polling endpoint:
 * Dacă ai endpoint dedicat (ex: /api/stripe/checkout-status?session_id=...),
 * poți activa polling și verifica confirmarea Stripe după redirect.
 */
async function fetchStripeCheckoutStatus(sessionId: string) {
  const res = await fetch(
    `/api/stripe/checkout-status?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (!res.ok) {
    throw new Error(`Stripe status fetch failed: ${res.status}`);
  }

  return (await res.json()) as Record<string, unknown>;
}

export default function SuccessClient() {
  const searchParams = useSearchParams();

  // Stripe / custom params
  const sessionId = searchParams?.get("session_id") ?? null;
  const tokenFromQuery =
    searchParams?.get("order") ??
    searchParams?.get("token") ??
    searchParams?.get("publicToken") ??
    null;

  const [order, setOrder] = useState<NormalizedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // 1) încearcă să încarci comanda dacă ai token
        if (tokenFromQuery) {
          const data = await fetchOrderPublic(tokenFromQuery);
          if (!cancelled) setOrder(data);
        }

        // 2) dacă ai session_id și vrei confirmare Stripe după redirect,
        // încearcă polling pe endpointul tău (dacă există)
        if (sessionId) {
          setIsPolling(true);

          const maxAttempts = 8;
          let attempt = 0;

          const poll = async () => {
            attempt += 1;

            try {
              const statusPayload = await fetchStripeCheckoutStatus(sessionId);

              const paymentStatus = String(
                statusPayload.payment_status ?? statusPayload.status ?? "",
              ).toLowerCase();

              // Dacă endpointul întoarce și tokenul, îl folosim să reîncărcăm comanda
              const apiToken =
                (typeof statusPayload.publicToken === "string" &&
                  statusPayload.publicToken) ||
                (typeof statusPayload.public_token === "string" &&
                  statusPayload.public_token) ||
                tokenFromQuery;

              if (
                paymentStatus === "paid" ||
                paymentStatus === "complete" ||
                paymentStatus === "succeeded"
              ) {
                if (apiToken && !cancelled) {
                  try {
                    const refreshedOrder = await fetchOrderPublic(apiToken);
                    if (!cancelled) setOrder(refreshedOrder);
                  } catch {
                    // ignore refresh errors
                  }
                }

                if (!cancelled) setIsPolling(false);
                return;
              }

              if (attempt < maxAttempts && !cancelled) {
                pollTimer = setTimeout(() => {
                  void poll();
                }, 1500);
              } else if (!cancelled) {
                setIsPolling(false);
              }
            } catch {
              // Dacă endpointul nu există încă / dă eroare, nu blocăm pagina
              if (!cancelled) setIsPolling(false);
            }
          };

          void poll();
        } else {
          setIsPolling(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "A apărut o eroare la încărcarea confirmării.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [sessionId, tokenFromQuery]);

  const total = useMemo(() => {
    if (order && toNumber(order.totalAmount) > 0)
      return toNumber(order.totalAmount);

    return (order?.items ?? []).reduce((sum, item) => {
      const qty = toNumber(item.qty ?? item.quantity ?? 0);
      const line = toNumber(
        item.totalPrice ?? item.lineTotal ?? item.line_total,
      );
      if (line > 0) return sum + line;

      const unit = toNumber(item.unitPrice ?? item.unit_price ?? item.price);
      return sum + qty * unit;
    }, 0);
  }, [order]);

  const normalizedPaymentState = useMemo(() => {
    const raw = String(
      order?.paymentStatus ?? order?.status ?? "",
    ).toLowerCase();

    if (
      raw.includes("paid") ||
      raw.includes("succeeded") ||
      raw.includes("complete") ||
      raw.includes("completed")
    ) {
      return "paid";
    }

    if (
      raw.includes("pending") ||
      raw.includes("processing") ||
      raw.includes("unpaid") ||
      raw.includes("open")
    ) {
      return "pending";
    }

    return "unknown";
  }, [order]);

  const titleText =
    normalizedPaymentState === "paid"
      ? "Plata a fost confirmată"
      : normalizedPaymentState === "pending" || isPolling
        ? "Plata este în curs de confirmare"
        : "Mulțumim pentru comandă";

  const subtitleText =
    normalizedPaymentState === "paid"
      ? "Comanda ta a fost înregistrată cu succes. Biletele vor fi trimise pe email după procesare."
      : normalizedPaymentState === "pending" || isPolling
        ? "Am primit redirecționarea de la Stripe. Verificăm statusul plății și actualizăm comanda."
        : "Dacă plata a fost efectuată, statusul se va actualiza în scurt timp.";

  return (
    <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
        <div className="fixed top-20 left-0 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#7C4DFF]/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="space-y-6">
          <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border shrink-0 ${
                  normalizedPaymentState === "paid"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                    : "bg-amber-500/15 text-amber-200 border-amber-400/30"
                }`}
              >
                <span className="material-symbols-outlined">
                  {normalizedPaymentState === "paid"
                    ? "check_circle"
                    : "hourglass_top"}
                </span>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {titleText}
                </h1>
                <p className="text-[#B39DDB] mt-2">{subtitleText}</p>

                {sessionId && (
                  <p className="text-xs text-[#B39DDB] mt-3 break-all">
                    Session ID Stripe:{" "}
                    <span className="text-slate-200">{sessionId}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {error && (
            <section className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
              {error}
            </section>
          )}

          {(isLoading || isPolling) && (
            <section className="rounded-2xl border border-[#432C7A] bg-[#24123E]/70 p-4 text-[#B39DDB]">
              {isLoading
                ? "Se încarcă datele comenzii..."
                : "Se verifică confirmarea Stripe..."}
            </section>
          )}

          <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-white text-xl font-bold">Detalii comandă</h2>
              {order?.publicToken && (
                <span className="text-xs px-2 py-1 rounded-md border border-[#432C7A] text-[#B39DDB] bg-[#24123E]">
                  Token: {order.publicToken}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#B39DDB]">Status comandă</span>
                <span className="text-white">
                  {order?.status ?? "Necunoscut"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#B39DDB]">Status plată</span>
                <span className="text-white">
                  {order?.paymentStatus ?? "Necunoscut"}
                </span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-[#432C7A] to-transparent my-2" />

              <div className="flex justify-between items-end">
                <span className="text-[#B39DDB] text-sm">Total</span>
                <span className="text-xl font-extrabold text-white">
                  {formatMoney(total, order?.currency || "RON")}
                </span>
              </div>
            </div>
          </section>

          {order?.items?.length ? (
            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <h2 className="text-white text-xl font-bold mb-4">Bilete</h2>

              <div className="space-y-3">
                {order.items.map((item, index) => {
                  const qty = toNumber(item.qty ?? item.quantity ?? 0);
                  const unit = toNumber(
                    item.unitPrice ?? item.unit_price ?? item.price,
                  );
                  const line =
                    toNumber(
                      item.totalPrice ?? item.lineTotal ?? item.line_total,
                    ) || qty * unit;

                  const label = item.name || item.label || "Bilet";
                  const category =
                    String(item.category || "").toLowerCase() === "vip"
                      ? "VIP"
                      : "Acces General";

                  return (
                    <div
                      key={item.id || `item-${index}`}
                      className="flex justify-between items-start gap-3 bg-[#1A0B2E]/30 p-3 rounded-xl border border-transparent hover:border-[#00E5FF]/20 transition-all"
                    >
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">
                          {category} - {label}
                        </p>
                        <p className="text-[#B39DDB] text-xs mt-1">
                          {qty} x {formatMoney(unit, order?.currency || "RON")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[#FFD700] font-bold text-sm">
                          {formatMoney(line, order?.currency || "RON")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/tickets"
              className="h-12 px-5 rounded-xl bg-[#24123E] border border-[#432C7A] text-[#B39DDB] hover:text-white hover:border-[#00E5FF]/50 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                confirmation_number
              </span>
              Înapoi la bilete
            </Link>

            {tokenFromQuery ? (
              <Link
                href={`/checkout?order=${encodeURIComponent(tokenFromQuery)}`}
                className="h-12 px-5 rounded-xl bg-[#24123E] border border-[#432C7A] text-[#B39DDB] hover:text-white hover:border-[#00E5FF]/50 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">
                  shopping_cart
                </span>
                Vezi checkout
              </Link>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

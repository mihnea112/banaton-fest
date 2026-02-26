"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type IssuedTicket = {
  id: string;
  ticket_number?: number | null;
  qr_code_text?: string | null;
  status?: string | null;
  order_item_id?: string | null;
};

type TicketsPublicResponse = {
  ok?: boolean;
  order?: {
    public_token?: string | null;
    status?: string | null;
    payment_status?: string | null;
    customer_first_name?: string | null;
    customer_last_name?: string | null;
    customer_email?: string | null;
  };
  tickets?: IssuedTicket[];
  // alternative shapes
  data?: {
    order?: TicketsPublicResponse["order"];
    tickets?: IssuedTicket[];
    issued_tickets?: IssuedTicket[];
  };
  issued_tickets?: IssuedTicket[];
  error?: { message?: string };
  message?: string;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizePaymentState(order: TicketsPublicResponse["order"]) {
  const raw = String(
    order?.payment_status ?? order?.status ?? "",
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
}

function normalizeTicketsPayload(input: TicketsPublicResponse): TicketsPublicResponse {
  const root = (input || {}) as TicketsPublicResponse;

  const order =
    root.order ||
    root.data?.order ||
    // tolerate APIs that return `data` as the order object
    ((root.data as any)?.public_token ? (root.data as any) : undefined);

  const tickets =
    root.tickets ||
    root.issued_tickets ||
    root.data?.tickets ||
    root.data?.issued_tickets ||
    // tolerate APIs that return `data` as the tickets array
    (Array.isArray(root.data) ? (root.data as any) : undefined);

  return {
    ...root,
    order: order || undefined,
    tickets: Array.isArray(tickets) ? tickets : [],
  };
}

async function fetchTicketsPublic(
  token: string,
): Promise<TicketsPublicResponse> {
  const res = await fetch(
    `/api/tickets/public?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  const json = (await res.json().catch(() => ({}))) as TicketsPublicResponse;
  const normalized = normalizeTicketsPayload(json);

  if (!res.ok || normalized?.ok === false) {
    const msg =
      asString(normalized?.error?.message) ||
      asString((normalized as any)?.message) ||
      `Tickets fetch failed (${res.status})`;
    throw new Error(msg);
  }

  return normalized;
}

export default function SuccessClient() {
  const searchParams = useSearchParams();

  const sessionId = searchParams?.get("session_id") ?? null;
  const tokenFromQuery =
    searchParams?.get("order") ??
    searchParams?.get("token") ??
    searchParams?.get("publicToken") ??
    null;

  const [data, setData] = useState<TicketsPublicResponse | null>(null);
  const [qrSvgByTicketId, setQrSvgByTicketId] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tickets + poll until webhook issues them (or payment flips to paid)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function loadOnce() {
      if (!tokenFromQuery) {
        setData(null);
        setIsLoading(false);
        return;
      }

      try {
        if (!cancelled) setError(null);
        const payload = await fetchTicketsPublic(tokenFromQuery);
        if (!cancelled) setData(payload);
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Eroare la încărcare.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    async function poll() {
      if (!tokenFromQuery) return;

      setIsPolling(true);

      const maxAttempts = 18;
      let attempt = 0;

      const step = async () => {
        attempt += 1;
        try {
          const payload = await fetchTicketsPublic(tokenFromQuery);

          const paymentState = normalizePaymentState(payload.order);
          const hasTickets = (payload.tickets || []).length > 0;

          if (!cancelled) setData(payload);

          if (hasTickets || paymentState === "paid") {
            if (!cancelled) setIsPolling(false);
            return;
          }

          if (attempt < maxAttempts && !cancelled) {
            timer = setTimeout(() => void step(), 1500);
          } else if (!cancelled) {
            setIsPolling(false);
          }
        } catch {
          if (!cancelled) setIsPolling(false);
        }
      };

      void step();
    }

    setError(null);
    setIsLoading(true);
    void loadOnce().then(() => void poll());

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tokenFromQuery]);

  // Build SVG QR codes client-side (qrcode -> svg)
  useEffect(() => {
    let cancelled = false;

    async function buildSvgs() {
      const tickets = data?.tickets || [];
      if (!tickets.length) return;

      // dynamic import to keep bundle clean
      const QRCode = await import("qrcode");

      const next: Record<string, string> = {};
      for (const t of tickets) {
        const fallbackToken = tokenFromQuery || "unknown";
        const text = t.qr_code_text || `banaton:${fallbackToken}:${t.id}`;
        try {
          const svg = await QRCode.toString(text, {
            type: "svg",
            errorCorrectionLevel: "M",
            margin: 1,
            width: 180,
          });
          next[t.id] = svg;
        } catch {
          // ignore per-ticket QR failures
        }
      }

      if (!cancelled) setQrSvgByTicketId(next);
    }

    void buildSvgs();

    return () => {
      cancelled = true;
    };
  }, [data, tokenFromQuery]);

  const paymentState = useMemo(
    () => normalizePaymentState(data?.order),
    [data],
  );

  const buyerName = useMemo(() => {
    const fn = data?.order?.customer_first_name || "";
    const ln = data?.order?.customer_last_name || "";
    const full = `${fn} ${ln}`.trim();
    return full || null;
  }, [data]);

  const hasTickets = (data?.tickets || []).length > 0;

  const titleText =
    paymentState === "paid"
      ? "Plata a fost confirmată"
      : paymentState === "pending" || isPolling
        ? "Plata este în curs de confirmare"
        : "Mulțumim pentru comandă";

  const subtitleText =
    paymentState === "paid"
      ? hasTickets
        ? "Biletele tale sunt generate. Salvează PDF-ul și păstrează QR-urile pentru intrare."
        : "Plata e confirmată. Dacă biletele nu apar în 1-2 minute, dă refresh sau contactează suportul."
      : paymentState === "pending" || isPolling
        ? "Am primit redirecționarea de la Stripe. Așteptăm confirmarea finală și emiterea biletelor."
        : "Dacă plata a fost efectuată, statusul se va actualiza în scurt timp.";

  const pdfHref = tokenFromQuery
    ? `/api/tickets/pdf?token=${encodeURIComponent(tokenFromQuery)}`
    : "#";

  const canDownloadPdf = !!tokenFromQuery && paymentState === "paid" && hasTickets;

  return (
    <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
      <main className="flex-grow w-full max-w-5xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
        <div className="fixed top-20 left-0 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#7C4DFF]/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="space-y-6">
          <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border shrink-0 ${
                  paymentState === "paid"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                    : "bg-amber-500/15 text-amber-200 border-amber-400/30"
                }`}
              >
                <span className="material-symbols-outlined">
                  {paymentState === "paid" ? "check_circle" : "hourglass_top"}
                </span>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {titleText}
                </h1>
                <p className="text-[#B39DDB] mt-2">{subtitleText}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {buyerName ? (
                    <span className="px-2 py-1 rounded-md border border-[#432C7A] text-[#B39DDB] bg-[#24123E]">
                      {buyerName}
                    </span>
                  ) : null}

                  {data?.order?.customer_email ? (
                    <span className="px-2 py-1 rounded-md border border-[#432C7A] text-[#B39DDB] bg-[#24123E]">
                      {data.order.customer_email}
                    </span>
                  ) : null}

                  {/* low-key token */}
                  {data?.order?.public_token || tokenFromQuery ? (
                    <span className="px-2 py-1 rounded-md border border-[#432C7A] text-[#B39DDB] bg-[#24123E]">
                      Token:{" "}
                      {(data?.order?.public_token || tokenFromQuery) as string}
                    </span>
                  ) : null}
                </div>

                {/* low-key session id */}
                {sessionId ? (
                  <details className="mt-3 text-xs text-[#B39DDB]">
                    <summary className="cursor-pointer select-none hover:text-white transition-colors">
                      Detalii tehnice
                    </summary>
                    <div className="mt-2 break-all">
                      Session ID Stripe:{" "}
                      <span className="text-slate-200">{sessionId}</span>
                    </div>
                  </details>
                ) : null}
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
                ? "Se încarcă biletele..."
                : "Se verifică confirmarea / emiterea biletelor..."}
            </section>
          )}

          {/* Actions */}
          <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">Bilete & PDF</h2>
                <p className="text-[#B39DDB] text-sm mt-1">
                  Dacă ești la intrare, poți arăta QR-ul direct de aici.
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  href="/tickets"
                  className="h-11 px-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-[#B39DDB] hover:text-white hover:border-[#00E5FF]/50 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    confirmation_number
                  </span>
                  Înapoi la bilete
                </Link>

                <a
                  href={pdfHref}
                  aria-disabled={!canDownloadPdf}
                  className={`h-11 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                    canDownloadPdf
                      ? "bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#24123E] border-transparent hover:from-[#FFE066] hover:to-[#FDB931]"
                      : "bg-[#24123E] border-[#432C7A] text-[#B39DDB] opacity-60 pointer-events-none"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>
                  Descarcă PDF
                </a>
              </div>
            </div>
          </section>

          {/* Tickets with SVG QR */}
          {hasTickets ? (
            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <h2 className="text-white text-xl font-bold mb-4">QR bilete</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.tickets || []).map((t) => {
                  const svg = qrSvgByTicketId[t.id];
                  const no = t.ticket_number ?? null;

                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-[#432C7A] bg-[#1A0B2E]/35 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-white font-semibold text-sm">
                          {no ? `Ticket #${no}` : "Ticket"}
                        </p>
                        <span className="text-xs px-2 py-1 rounded-md border border-[#432C7A] text-[#B39DDB] bg-[#24123E]">
                          {String(t.status || "valid")}
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl bg-white p-3 flex items-center justify-center overflow-hidden">
                        {svg ? (
                          <div
                            className="w-full flex items-center justify-center"
                            // SVG is produced by qrcode lib; safe enough for this controlled source.
                            dangerouslySetInnerHTML={{ __html: svg }}
                          />
                        ) : (
                          <div className="text-sm text-slate-500">
                            Se generează QR...
                          </div>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-[#B39DDB]">
                        Prezintă acest QR la intrare.
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

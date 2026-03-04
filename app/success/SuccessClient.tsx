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
  items?: Array<{
    id: string;
    category?: string | null;
    qty?: number | null;
    product_name_snapshot?: string | null;
    variant_label_snapshot?: string | null;
    canonical_day_set?: string | null;
    // optional VIP allocation hints if backend ever includes them
    vip_table_label?: string | null;
    vip_table_id?: string | null;
  }>;
  // alternative shapes
  data?: {
    order?: TicketsPublicResponse["order"];
    tickets?: IssuedTicket[];
    issued_tickets?: IssuedTicket[];
    items?: TicketsPublicResponse["items"];
  };
  issued_tickets?: IssuedTicket[];
  error?: { message?: string };
  message?: string;
  tickets_ready?: boolean;
  tickets_email_sent?: boolean;
  tickets_email_sent_at?: string | null;
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

  const items =
    root.items ||
    root.data?.items ||
    ((root.data as any)?.items && Array.isArray((root.data as any).items)
      ? ((root.data as any).items as any)
      : undefined);

  // preserve new flags (they are already included in ...root, but ensure type)
  return {
    ...root,
    order: order || undefined,
    tickets: Array.isArray(tickets) ? tickets : [],
    items: Array.isArray(items) ? items : [],
    tickets_ready: root.tickets_ready,
    tickets_email_sent: root.tickets_email_sent,
    tickets_email_sent_at: root.tickets_email_sent_at,
  };
}

function labelCategory(category: unknown) {
  const c = String(category || "").toLowerCase();
  if (c === "vip") return "VIP";
  // IMPORTANT: General Access is called Fan Pit
  return "Fan Pit";
}

function formatDays(canonicalDaySet: unknown) {
  const raw = String(canonicalDaySet || "").trim();
  if (!raw) return null;
  return raw
    .split(/\s*,\s*/g)
    .filter(Boolean)
    .map((d) => d.toUpperCase())
    .join(", ");
}

type Lang = "ro" | "en";

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

export default function SuccessClient({ lang = "ro" }: { lang?: Lang }) {
  const searchParams = useSearchParams();
  const isEn = lang === "en";
  const tr = (ro: string, en: string) => (isEn ? en : ro);

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
          const ticketsReady = payload.tickets_ready === true;

          if (!cancelled) setData(payload);

          // Stop only when tickets are actually ready
          if (hasTickets || ticketsReady) {
            if (!cancelled) setIsPolling(false);
            return;
          }

          // If paid but tickets not ready yet, keep polling for ticket issuance
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

  const itemById = useMemo(() => {
    const map = new Map<string, NonNullable<TicketsPublicResponse["items"]>[number]>();
    for (const it of data?.items || []) {
      if (it && typeof it.id === "string") map.set(it.id, it as any);
    }
    return map;
  }, [data]);

  const hasTickets = (data?.tickets || []).length > 0;

  const titleText =
    paymentState === "paid"
      ? tr("Plata a fost confirmată", "Payment confirmed")
      : paymentState === "pending" || isPolling
        ? tr("Plata este în curs de confirmare", "Payment is being confirmed")
        : tr("Mulțumim pentru comandă", "Thanks for your order");

  const subtitleText =
    paymentState === "paid"
      ? hasTickets
        ? tr(
            "Biletele tale sunt generate. Salvează PDF-ul și păstrează QR-urile pentru intrare.",
            "Your tickets are ready. Download the PDF and keep the QR codes for entry.",
          )
        : tr(
            "Plata e confirmată. Dacă biletele nu apar în 1-2 minute, dă refresh sau contactează suportul.",
            "Payment is confirmed. If tickets don't show up in 1–2 minutes, refresh or contact support.",
          )
      : paymentState === "pending" || isPolling
        ? tr(
            "Am primit redirecționarea de la Stripe. Așteptăm confirmarea finală și emiterea biletelor.",
            "We received the redirect from Stripe. Waiting for final confirmation and ticket issuance.",
          )
        : tr(
            "Dacă plata a fost efectuată, statusul se va actualiza în scurt timp.",
            "If the payment was completed, the status will update shortly.",
          );

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
                  {data?.order?.customer_email ? (
                    <span className="px-2 py-1 rounded-md border border-[#432C7A] text-[#B39DDB] bg-[#24123E]">
                      {data.order.customer_email}
                    </span>
                  ) : null}

                  {/* Email sent badge */}
                  {data?.tickets_email_sent ? (
                    <span className="px-2 py-1 rounded-md border border-[#432C7A] text-emerald-200 bg-emerald-500/10">
                      {tr("Email trimis", "Email sent")}
                    </span>
                  ) : null}
                </div>
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
                ? tr("Se încarcă biletele...", "Loading tickets...")
                : tr(
                    "Se verifică confirmarea / emiterea biletelor...",
                    "Checking confirmation / issuing tickets...",
                  )}
            </section>
          )}

          {/* Actions */}
          <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-white text-xl font-bold">{tr("Bilete & PDF", "Tickets & PDF")}</h2>
                <p className="text-[#B39DDB] text-sm mt-1">
                  {tr("Dacă ești la intrare, poți arăta QR-ul direct de aici.", "At the entrance, you can show the QR code directly from here.")}
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
                  {tr("Înapoi la bilete", "Back to tickets")}
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
                  {tr("Descarcă PDF", "Download PDF")}
                </a>
              </div>
            </div>
          </section>

          {/* Tickets with SVG QR */}
          {hasTickets ? (
            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <h2 className="text-white text-xl font-bold mb-4">{tr("QR bilete", "Ticket QR codes")}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.tickets || []).map((t) => {
                  const svg = qrSvgByTicketId[t.id];
                  const no = t.ticket_number ?? null;
                  const item = t.order_item_id ? itemById.get(t.order_item_id) : undefined;
                  const typeLabel = labelCategory(item?.category);
                  const productName = asString(item?.product_name_snapshot) || null;
                  const variant = asString(item?.variant_label_snapshot) || null;
                  const days = formatDays(item?.canonical_day_set);
                  const vipTable = asString((item as any)?.vip_table_label) || asString((item as any)?.vip_table_id) || null;

                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-[#432C7A] bg-[#1A0B2E]/35 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-white font-semibold text-sm">
                            {no ? `Ticket #${no}` : "Ticket"}
                          </p>
                          <p className="text-[#B39DDB] text-xs">
                            {typeLabel}
                            {productName ? ` — ${productName}` : ""}
                            {variant ? ` · ${variant}` : ""}
                          </p>
                          {typeLabel === "VIP" && vipTable ? (
                            <p className="text-[#FFD700] text-xs font-semibold mt-0.5">
                              Masă: {vipTable}
                            </p>
                          ) : null}
                          {days ? (
                            <p className="text-[#B39DDB] text-[11px] mt-0.5">Zile: {days}</p>
                          ) : null}
                        </div>
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
                            {tr("Se generează QR...", "Generating QR...")}
                          </div>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-[#B39DDB]">
                        {tr("Prezintă acest QR la intrare.", "Show this QR code at the entrance.")}
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

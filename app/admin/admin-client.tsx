"use client";

import { useEffect, useState, useCallback } from "react";

type Overview =
  | {
      ok: true;
      data: {
        paidOrders: number;
        ticketsIssued: number;
        checkedIn: number;
        totalRevenueRon?: number;
      };
    }
  | { ok: false; error: { message: string } };

function formatLei(value?: number | null) {
  if (value === undefined || value === null || isNaN(value)) {
    return "0 lei";
  }
  return value.toLocaleString("ro-RO") + " lei";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ro-RO");
}

type OrderRow = {
  id: string;
  public_token: string | null;
  status: string | null;
  payment_status: string | null;
  total_ron: number | null;
  currency: string | null;
  customer_email: string | null;
  customer_full_name: string | null;
  created_at: string | null;
  tickets_email_sent_at?: string | null;
};

type OrdersPageResponse =
  | {
      ok: true;
      data: {
        rows: OrderRow[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }
  | { ok: false; error: { message: string } };

function emailStatusLabel(sentAt?: string | null) {
  if (!sentAt) return { label: "NEtrimis", cls: "text-amber-200" };
  return { label: "Trimis", cls: "text-emerald-200" };
}

export default function AdminClient() {
  const [data, setData] = useState<Overview | null>(null);

  const [orders, setOrders] = useState<OrdersPageResponse | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PAGE_SIZE = 25;

  const [isDeletingUnpaid, setIsDeletingUnpaid] = useState(false);
  const [deleteUnpaidError, setDeleteUnpaidError] = useState<string | null>(null);
  const [deleteUnpaidMessage, setDeleteUnpaidMessage] = useState<string | null>(null);

  const [resendBusyId, setResendBusyId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [overviewRes, ordersRes] = await Promise.all([
      fetch("/api/admin/overview", { cache: "no-store" }),
      fetch(
        `/api/admin/orders?page=${ordersPage}&pageSize=${ORDERS_PAGE_SIZE}`,
        { cache: "no-store" },
      ),
    ]);

    const overviewJson = (await overviewRes.json().catch(() => ({}))) as Overview;
    const ordersJson = (await ordersRes.json().catch(() => ({}))) as OrdersPageResponse;

    setData(overviewJson);
    setOrders(ordersJson);
  }, [ordersPage]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const [overviewRes, ordersRes] = await Promise.all([
        fetch("/api/admin/overview", { cache: "no-store" }),
        fetch(
          `/api/admin/orders?page=${ordersPage}&pageSize=${ORDERS_PAGE_SIZE}`,
          { cache: "no-store" },
        ),
      ]);

      const overviewJson = (await overviewRes.json().catch(() => ({}))) as Overview;
      const ordersJson = (await ordersRes.json().catch(() => ({}))) as OrdersPageResponse;

      if (!stop) {
        setData(overviewJson);
        setOrders(ordersJson);
      }
    })();

    return () => {
      stop = true;
    };
  }, [ordersPage]);

  return (
    <div className="min-h-screen bg-[#130026] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={load}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E] text-indigo-200 hover:bg-[#2a164d]"
              type="button"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={async () => {
                if (isDeletingUnpaid) return;

                setDeleteUnpaidError(null);
                setDeleteUnpaidMessage(null);

                const ok = window.confirm(
                  "Ștergi toate comenzile cu payment_status = 'unpaid'? Această acțiune este ireversibilă.",
                );
                if (!ok) return;

                try {
                  setIsDeletingUnpaid(true);
                  const res = await fetch("/api/admin/orders/delete-unpaid", {
                    method: "POST",
                    headers: { Accept: "application/json" },
                  });

                  const json = (await res.json().catch(() => ({}))) as any;

                  if (!res.ok || json?.ok === false) {
                    throw new Error(
                      json?.error?.message ||
                        json?.message ||
                        `Nu am putut șterge comenzile neplătite (${res.status}).`,
                    );
                  }

                  const deleted =
                    typeof json?.deleted === "number"
                      ? json.deleted
                      : typeof json?.data?.deleted === "number"
                        ? json.data.deleted
                        : null;

                  setDeleteUnpaidMessage(
                    deleted !== null
                      ? `Ștergere completă: ${deleted} comenzi neplătite.`
                      : "Ștergere completă.",
                  );

                  // refresh dashboard data
                  await load();
                } catch (err) {
                  setDeleteUnpaidError(
                    err instanceof Error
                      ? err.message
                      : "A apărut o eroare la ștergerea comenzilor neplătite.",
                  );
                } finally {
                  setIsDeletingUnpaid(false);
                }
              }}
              disabled={isDeletingUnpaid}
              className={
                "w-full sm:w-auto px-4 py-2 rounded-lg border border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/15 " +
                (isDeletingUnpaid ? "opacity-60 cursor-not-allowed" : "")
              }
            >
              {isDeletingUnpaid ? "Șterg..." : "Șterge comenzile neplătite"}
            </button>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/auth?next=/admin";
              }}
            >
              <button className="w-full sm:w-auto px-4 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E]">
                Logout
              </button>
            </form>
          </div>
        </div>

        {(deleteUnpaidError || deleteUnpaidMessage) && (
          <div className="mt-4">
            {deleteUnpaidError ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
                {deleteUnpaidError}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">
                {deleteUnpaidMessage}
              </div>
            )}
          </div>
        )}

        {(resendError || resendMessage) && (
          <div className="mt-4">
            {resendError ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
                {resendError}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-emerald-100">
                {resendMessage}
              </div>
            )}
          </div>
        )}

        {!data ? (
          <div className="mt-6 text-indigo-200">Loading...</div>
        ) : data.ok !== true ? (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4">
            {data.error?.message || "Error"}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card title="Comenzi plătite" value={data.data.paidOrders} />
              <Card title="Bilete emise" value={data.data.ticketsIssued} />
              <Card title="Check-in" value={data.data.checkedIn} />
              <Card title="Venit total" value={data.data.totalRevenueRon ?? 0} />
            </div>

            <div className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold">Comenzi</h2>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                    disabled={!orders || orders.ok !== true || orders.data.page <= 1}
                    className="px-3 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E] text-indigo-200 disabled:opacity-50"
                  >
                    Înapoi
                  </button>
                  <div className="text-indigo-200 text-sm min-w-[120px] text-center">
                    Pagina {orders && orders.ok === true ? orders.data.page : ordersPage}
                    {orders && orders.ok === true ? ` / ${orders.data.totalPages}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!orders || orders.ok !== true) return;
                      setOrdersPage((p) => Math.min(orders.data.totalPages, p + 1));
                    }}
                    disabled={!orders || orders.ok !== true || orders.data.page >= orders.data.totalPages}
                    className="px-3 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E] text-indigo-200 disabled:opacity-50"
                  >
                    Înainte
                  </button>
                </div>
              </div>

              {!orders ? (
                <p className="text-indigo-200">Loading orders...</p>
              ) : orders.ok !== true ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
                  {orders.error?.message || "Error"}
                </div>
              ) : orders.data.rows.length === 0 ? (
                <p className="text-indigo-400 text-sm italic">Nu există comenzi.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#4C2A85] bg-[#1A0B2E]">
                  <table className="min-w-[900px] w-full table-auto text-left text-indigo-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Data</th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Client</th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Total</th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Status</th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Email bilete (status)</th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Acțiuni</th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">Token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.data.rows.map((order) => {
                        const clientLabel =
                          order.customer_full_name?.trim() ||
                          order.customer_email?.trim() ||
                          "—";

                        const statusLabel =
                          order.payment_status || order.status || "—";

                        const mail = emailStatusLabel(order.tickets_email_sent_at ?? null);

                        return (
                          <tr
                            key={order.id}
                            className="border-b border-[#4C2A85] last:border-0"
                          >
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="px-3 py-2 align-top break-words max-w-[260px]">
                              {clientLabel}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {formatLei(order.total_ron)}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {statusLabel}
                            </td>
                            <td className={"px-3 py-2 align-top whitespace-nowrap " + mail.cls}>
                              <div className="flex flex-col">
                                <span>{mail.label}</span>
                                {order.tickets_email_sent_at ? (
                                  <span className="text-xs text-indigo-300">{formatDate(order.tickets_email_sent_at)}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <button
                                type="button"
                                disabled={resendBusyId === order.id || !order.public_token}
                                className={
                                  "px-3 py-2 rounded-lg border border-[#4C2A85] bg-[#130026] text-indigo-100 hover:bg-[#2a164d] disabled:opacity-50 disabled:cursor-not-allowed " +
                                  (resendBusyId === order.id ? "opacity-60 cursor-not-allowed" : "")
                                }
                                onClick={async () => {
                                  setResendError(null);
                                  setResendMessage(null);

                                  const current = order.customer_email || "";
                                  const nextEmail = window.prompt(
                                    "Email nou pentru trimitere bilete (va suprascrie în DB):",
                                    current,
                                  );
                                  if (!nextEmail) return;

                                  try {
                                    setResendBusyId(order.id);

                                    // Replacement resend logic
                                    if (!order.public_token) {
                                      throw new Error("Comanda nu are public_token.");
                                    }

                                    const res = await fetch("/api/tickets/public", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Accept: "application/json",
                                      },
                                      body: JSON.stringify({
                                        token: order.public_token,
                                        email: nextEmail.trim(),
                                      }),
                                    });

                                    const json = (await res.json().catch(() => ({}))) as any;
                                    if (!res.ok || json?.ok === false) {
                                      throw new Error(
                                        json?.error?.message ||
                                          json?.message ||
                                          `Nu am putut retrimite email (${res.status}).`,
                                      );
                                    }

                                    setResendMessage(
                                      "Email-ul a fost retrimis (și emailul din DB a fost actualizat).",
                                    );

                                    await load();
                                  } catch (e) {
                                    setResendError(
                                      e instanceof Error
                                        ? e.message
                                        : "Eroare la retrimitere email.",
                                    );
                                  } finally {
                                    setResendBusyId(null);
                                  }
                                }}
                              >
                                {resendBusyId === order.id ? "Trimit..." : "Retrimite"}
                              </button>
                            </td>
                            <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
                              {order.public_token
                                ? order.public_token.length > 10
                                  ? order.public_token.slice(0, 6) +
                                    "…" +
                                    order.public_token.slice(-4)
                                  : order.public_token
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-[#4C2A85] text-indigo-200 text-sm">
                    <div>
                      Total: <span className="font-semibold">{orders.data.total}</span> ·
                      Pagina: <span className="font-semibold">{orders.data.page}</span> / {orders.data.totalPages}
                    </div>
                    <div>
                      Afișez <span className="font-semibold">{orders.data.rows.length}</span> / {orders.data.pageSize}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#4C2A85] bg-[#1A0B2E] p-5">
      <div className="text-indigo-200 text-sm">{title}</div>
      <div className="text-2xl sm:text-3xl font-black mt-2 break-words">{value}</div>
    </div>
  );
}

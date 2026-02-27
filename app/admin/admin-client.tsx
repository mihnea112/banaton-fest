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
        latestOrders?: Array<{
          id: string;
          public_token?: string | null;
          status?: string | null;
          payment_status?: string | null;
          total_ron?: number | null;
          currency?: string | null;
          customer_email?: string | null;
          customer_full_name?: string | null;
          created_at?: string | null;
        }>;
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

export default function AdminClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [isDeletingUnpaid, setIsDeletingUnpaid] = useState(false);
  const [deleteUnpaidError, setDeleteUnpaidError] = useState<string | null>(null);
  const [deleteUnpaidMessage, setDeleteUnpaidMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as Overview;
    setData(json);
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Overview;
      if (!stop) setData(json);
    })();
    return () => {
      stop = true;
    };
  }, []);

  const ok = data?.ok === true;

  return (
    <div className="min-h-screen bg-[#130026] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between space-x-4">
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
          <div className="flex space-x-2">
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E] text-indigo-200 hover:bg-[#2a164d]"
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
                  "Ștergi toate comenzile NEPLĂTITE (draft/unpaid/pending)? Această acțiune este ireversibilă.",
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
                "px-4 py-2 rounded-lg border border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/15 " +
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
              <button className="px-4 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E]">
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

        {!data ? (
          <div className="mt-6 text-indigo-200">Loading...</div>
        ) : data.ok !== true ? (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4">
            {data.error?.message || "Error"}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card title="Comenzi plătite" value={data.data.paidOrders} />
              <Card title="Bilete emise" value={data.data.ticketsIssued} />
              <Card title="Check-in" value={data.data.checkedIn} />
              <Card title="Venit total" value={data.data.totalRevenueRon ?? 0} />
            </div>
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Ultimele comenzi</h2>
              {Array.isArray(data.data.latestOrders) &&
              data.data.latestOrders.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-[#4C2A85] bg-[#1A0B2E] p-4">
                  <table className="w-full table-auto text-left text-indigo-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">
                          Data
                        </th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">
                          Client
                        </th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">
                          Total
                        </th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">
                          Status
                        </th>
                        <th className="px-3 py-2 border-b border-[#4C2A85]">
                          Token
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.latestOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-[#4C2A85] last:border-0"
                        >
                          <td className="px-3 py-2 align-top">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-3 py-2 align-top break-words max-w-xs">
                            {order.customer_full_name
                              ? order.customer_full_name
                              : order.customer_email
                              ? order.customer_email
                              : "—"}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {formatLei(order.total_ron)}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {order.payment_status
                              ? order.payment_status
                              : order.status || "—"}
                          </td>
                          <td className="px-3 py-2 align-top font-mono text-sm">
                            {order.public_token
                              ? order.public_token.length > 8
                                ? order.public_token.slice(0, 4) +
                                  "…" +
                                  order.public_token.slice(-4)
                                : order.public_token
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-indigo-400 text-sm italic">
                  Nu există comenzi recente.
                </p>
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
      <div className="text-3xl font-black mt-2">{value}</div>
    </div>
  );
}

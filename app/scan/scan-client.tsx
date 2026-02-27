"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type ScanResult =
  | {
      ok: true;
      ticket: {
        id: string;
        ticket_number: number | null;
        status: string | null;
      };
      message: string;
    }
  | { ok: false; error: { message: string } };

export default function ScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [status, setStatus] = useState<string>("Ready");

  const [view, setView] = useState<"scanning" | "result">("scanning");
  const viewRef = useRef<"scanning" | "result">("scanning");

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const [lastQr, setLastQr] = useState<string | null>(null);
  const lastQrRef = useRef<string | null>(null);

  const [resultScreen, setResultScreen] = useState<
    | null
    | {
        ok: boolean;
        title: string;
        subtitle?: string;
        ticket?: {
          id: string;
          ticket_number: number | null;
          status: string | null;
        };
        qr?: string;
      }
  >(null);

  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    let stop = false;
    const reader = new BrowserMultiFormatReader();

    async function start() {
      try {
        setStatus("Starting camera...");
        const video = videoRef.current;
        if (!video) return;

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          async (result) => {
            if (!result || stop) return;
            if (viewRef.current !== "scanning") return;

            const text = result.getText();
            if (!text) return;

            // de-bounce same QR + avoid parallel calls
            if (text === lastQrRef.current || busyRef.current) return;

            busyRef.current = true;
            setBusy(true);
            lastQrRef.current = text;
            setLastQr(text);
            setStatus("Checking...");

            try {
              const res = await fetch("/api/admin/tickets/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qr: text }),
              });

              const json = (await res.json().catch(() => ({}))) as ScanResult;
              if (!res.ok || !json.ok)
                throw new Error((json as any)?.error?.message || "Invalid");

              setResultScreen({
                ok: true,
                title: "Bilet valid",
                subtitle: `Ticket #${json.ticket.ticket_number ?? "?"}`,
                ticket: json.ticket,
                qr: text,
              });
              setStatus("✅ OK");
              setView("result");
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Invalid";
              setResultScreen({
                ok: false,
                title: "Bilet invalid",
                subtitle: msg,
                qr: text,
              });
              setStatus(`❌ ${msg}`);
              setView("result");
            } finally {
              // allow next scans only after user clicks the button
              setBusy(false);
              busyRef.current = false;
            }
          },
        );

        controlsRef.current = controls as unknown as { stop: () => void };

        setStatus("Scanning...");
      } catch {
        setStatus("Camera error (check permissions).");
      }
    }

    void start();

    return () => {
      stop = true;
      try {
        controlsRef.current?.stop();
      } catch {
        // ignore
      }
      controlsRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#130026] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black">Scan Tickets</h1>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/auth?next=/scan";
            }}
          >
            <button className="px-4 py-2 rounded-lg border border-[#4C2A85] bg-[#1A0B2E]">
              Logout
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-2xl border border-[#4C2A85] bg-[#1A0B2E] p-4">
          <div className="text-indigo-200 text-sm mb-3">{status}</div>

          <div className="relative">
            <video ref={videoRef} className="w-full rounded-xl bg-black" />

            {view === "result" && resultScreen && (
              <div className="absolute inset-0 rounded-xl bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-[#4C2A85] bg-[#130026] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className={
                          resultScreen.ok
                            ? "text-emerald-200 text-sm font-semibold"
                            : "text-rose-200 text-sm font-semibold"
                        }
                      >
                        {resultScreen.ok ? "✅ OK" : "❌ INVALID"}
                      </div>
                      <h2 className="text-white text-2xl font-black mt-1">
                        {resultScreen.title}
                      </h2>
                      {resultScreen.subtitle ? (
                        <p className="text-indigo-200 text-sm mt-1">
                          {resultScreen.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      {resultScreen.ticket ? (
                        <div className="text-xs text-indigo-300 space-y-1">
                          <div>
                            <span className="text-indigo-200">ID:</span>{" "}
                            <span className="text-white break-all">
                              {resultScreen.ticket.id}
                            </span>
                          </div>
                          <div>
                            <span className="text-indigo-200">Status:</span>{" "}
                            <span className="text-white">
                              {resultScreen.ticket.status ?? "-"}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {resultScreen.qr ? (
                    <div className="mt-4 text-xs text-indigo-300">
                      QR: <code className="break-all">{resultScreen.qr}</code>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      // reset state and continue scanning
                      setResultScreen(null);
                      setView("scanning");
                      setStatus("Scanning...");
                      setLastQr(null);
                      lastQrRef.current = null;
                      setBusy(false);
                      busyRef.current = false;
                    }}
                    className="mt-5 w-full h-12 rounded-xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#24123E]"
                  >
                    Scanează următorul
                  </button>

                  <p className="mt-3 text-[11px] text-indigo-300">
                    Camera rămâne pornită; scanarea reîncepe după ce apeși butonul.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-indigo-300">
            Scanează QR-ul de pe bilet (cod: <code>banaton:...</code>).
          </div>

          {lastQr && (
            <div className="mt-2 text-[11px] text-indigo-400">
              Ultimul QR: <code className="break-all">{lastQr}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = useMemo(() => sp?.get("next") || "/admin", [sp]);

  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error?.message || json?.message || "Eroare");
      }

      router.replace(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  }

  const outerDivClass =
    "min-h-screen bg-[#130026] text-white flex items-center justify-center p-6";
  const formClass =
    "w-full max-w-md rounded-2xl border border-[#4C2A85] bg-[#1A0B2E] p-6";
  const inputClass =
    "mt-2 w-full h-12 rounded-xl bg-[#241242] border border-[#4C2A85] px-4 text-white";

  const buttonClass =
    "mt-5 w-full h-12 rounded-xl font-bold " +
    (loading
      ? "bg-[#3A2A55]"
      : "bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#130026]");

  // Build DOM without JSX so this file can remain `.ts`.
  return React.createElement(
    "div",
    { className: outerDivClass },
    React.createElement(
      "form",
      { onSubmit, className: formClass },
      React.createElement("h1", { className: "text-2xl font-black" }, "Admin Access"),
      React.createElement(
        "p",
        { className: "text-indigo-200 text-sm mt-1" },
        "Introduceți parola pentru acces.",
      ),
      React.createElement(
        "label",
        { className: "block mt-6 text-sm text-indigo-200" },
        "Parolă",
        React.createElement("input", {
          className: inputClass,
          type: "password",
          value: password,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
          autoFocus: true,
        }),
      ),
      err
        ? React.createElement(
            "div",
            {
              className:
                "mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100",
            },
            err,
          )
        : null,
      React.createElement(
        "button",
        {
          disabled: loading || password.length < 3,
          className: buttonClass,
          type: "submit",
        },
        loading ? "Se verifică..." : "Intră",
      ),
    ),
  );
}
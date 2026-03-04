import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import VipClient from "./VipClient";

export const dynamic = "force-dynamic";

async function readLangFromCookies(): Promise<"ro" | "en"> {
  const c = await cookies();
  const raw = c.get("banaton_locale")?.value || "ro";

  return raw.toLowerCase().startsWith("en") ? "en" : "ro";
}

export const metadata: Metadata = {
  title: "VIP",
  description: "VIP Banaton Fest 2026 — alege masa și beneficii VIP.",
  alternates: {
    canonical: "https://banaton-fest.vercel.app/vip",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function VipPage() {
  const lang = await readLangFromCookies();

  return (
    <Suspense
      fallback={
        <div className="bg-[#1A0B2E] text-slate-100 min-h-screen flex">
          <main className="w-full max-w-5xl mx-auto px-4 lg:px-10 py-10">
            <div className="rounded-2xl bg-[#2D1B4E]/70 backdrop-blur-md p-6 border border-[#432C7A] shadow-xl text-[#B39DDB]">
              {lang === "en" ? "Loading VIP page..." : "Se încarcă pagina VIP..."}
            </div>
          </main>
        </div>
      }
    >
      <VipClient lang={lang} />
    </Suspense>
  );
}
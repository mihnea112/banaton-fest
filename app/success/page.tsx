import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import SuccessClient from "./SuccessClient";

type Lang = "ro" | "en";

async function readLangFromCookies(): Promise<Lang> {
  const c = await cookies();
  const raw =
    c.get("banaton_locale")?.value ||
    c.get("banaton_lang")?.value ||
    c.get("NEXT_LOCALE")?.value ||
    c.get("locale")?.value ||
    "ro";

  const v = String(raw).toLowerCase();
  return v === "en" ? "en" : "ro";
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await readLangFromCookies();
  return {
    title: lang === "en" ? "Confirmation" : "Confirmare",
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function SuccessPage() {
  const lang = await readLangFromCookies();
  const isEn = lang === "en";
  const loadingText = isEn
    ? "Loading confirmation page..."
    : "Se încarcă pagina de confirmare...";

  return (
    <Suspense
      fallback={
        <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
          <main className="flex-grow w-full max-w-4xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
            <div className="rounded-2xl bg-[#2D1B4E]/70 backdrop-blur-md p-6 border border-[#432C7A] shadow-xl text-[#B39DDB]">
              {loadingText}
            </div>
          </main>
        </div>
      }
    >
      <SuccessClient lang={lang} />
    </Suspense>
  );
}

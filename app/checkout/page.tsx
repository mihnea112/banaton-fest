import { Suspense } from "react";
import { cookies } from "next/headers";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

type Lang = "ro" | "en";

async function readLangFromCookies(): Promise<Lang> {
  // Your project uses `banaton_locale` (and sometimes localStorage fallback on the client).
  // Server-side we can only read cookies.
  const c = await cookies();
  const raw =
    c.get("banaton_locale")?.value ||
    c.get("banaton_lang")?.value ||
    c.get("NEXT_LOCALE")?.value ||
    c.get("locale")?.value ||
    "ro";

  const v = String(raw).trim().toLowerCase();
  return v === "en" ? "en" : "ro";
}

export default async function CheckoutPage() {
  const lang = await readLangFromCookies();

  return (
    <Suspense
      fallback={
        <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
          <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
            <div className="rounded-2xl bg-[#2D1B4E]/70 backdrop-blur-md p-6 border border-[#432C7A] shadow-xl text-[#B39DDB]">
              {lang === "en"
                ? "Loading checkout…"
                : "Se încarcă pagina de checkout…"}
            </div>
          </main>
        </div>
      }
    >
      <CheckoutClient lang={lang} />
    </Suspense>
  );
}

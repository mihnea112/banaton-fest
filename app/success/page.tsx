import { Suspense } from "react";
import type { Metadata } from "next";
import SuccessClient from "./SuccessClient";

export const metadata: Metadata = {
  title: "Confirmare",
  robots: { index: false, follow: false, noarchive: true },
};

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
          <main className="flex-grow w-full max-w-4xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
            <div className="rounded-2xl bg-[#2D1B4E]/70 backdrop-blur-md p-6 border border-[#432C7A] shadow-xl text-[#B39DDB]">
              Se încarcă pagina de confirmare...
            </div>
          </main>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}

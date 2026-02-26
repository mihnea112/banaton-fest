import { Suspense } from "react";
import VipClient from "./VipClient";

export default function VipPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#1A0B2E] text-slate-100 min-h-screen flex">
          <main className="w-full max-w-5xl mx-auto px-4 lg:px-10 py-10">
            <div className="rounded-2xl bg-[#2D1B4E]/70 backdrop-blur-md p-6 border border-[#432C7A] shadow-xl text-[#B39DDB]">
              Se încarcă pagina VIP...
            </div>
          </main>
        </div>
      }
    >
      <VipClient />
    </Suspense>
  );
}
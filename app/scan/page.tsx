import { Suspense } from "react";
import ScanClient from "./scan-client";

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#130026] text-white p-6">Loading...</div>}>
      <ScanClient />
    </Suspense>
  );
}
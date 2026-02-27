import { Suspense } from "react";
import AdminClient from "./admin-client";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#130026] text-white p-6">
          Loading...
        </div>
      }
    >
      <AdminClient />
    </Suspense>
  );
}

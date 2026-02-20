import { Suspense } from "react";
import StageSignupClient from "./StageSignupClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-6">Loading…</div>}>
      <StageSignupClient />
    </Suspense>
  );
}
import { Suspense } from "react";
import StageSignupClient from "./StageSignupClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white">
          Loading…
        </div>
      }
    >
      <StageSignupClient />
    </Suspense>
  );
}
import { Suspense } from "react";
import ResetRequestClient from "./ResetRequestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResetRequestPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">Loading…</div>}>
      <ResetRequestClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import DemoCheckoutClient from "./DemoCheckoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-screen-sm px-4 py-10">Loading…</main>}>
      <DemoCheckoutClient />
    </Suspense>
  );
}

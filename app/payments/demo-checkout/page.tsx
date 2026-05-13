import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import DemoCheckoutClient from "./DemoCheckoutClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton variant="narrow" />}>
      <DemoCheckoutClient />
    </Suspense>
  );
}

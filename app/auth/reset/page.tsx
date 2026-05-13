import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import ResetRequestClient from "./ResetRequestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResetRequestPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="narrow" />}>
      <ResetRequestClient />
    </Suspense>
  );
}

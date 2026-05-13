import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import ResetConfirmClient from "./ResetConfirmClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResetConfirmPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="narrow" />}>
      <ResetConfirmClient />
    </Suspense>
  );
}

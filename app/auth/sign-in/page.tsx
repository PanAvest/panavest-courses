// Static edge sign-in shell; auth handled client-side via Supabase after hydration.
export const runtime = "edge";

import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import SignInClient from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="narrow" />}>
      <SignInClient />
    </Suspense>
  );
}

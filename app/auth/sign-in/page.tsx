// Static edge sign-in shell; auth handled client-side via Supabase after hydration.
export const runtime = "edge";

import { Suspense } from "react";
import SignInClient from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">Loading sign-in…</div>}>
      <SignInClient />
    </Suspense>
  );
}

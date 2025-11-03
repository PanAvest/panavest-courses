import { Suspense } from "react";
import SignInClient from "./SignInClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">Loading sign-in…</div>}>
      <SignInClient />
    </Suspense>
  );
}

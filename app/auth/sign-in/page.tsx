"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirected = useRef(false);

  useEffect(() => {
    let mounted = true;

    const go = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const next = search.get("next") || "/dashboard";
      if (data?.session && !redirected.current) {
        redirected.current = true;
        router.replace(next);
      }
    };

    go();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session && !redirected.current) {
        const next = search.get("next") || "/dashboard";
        redirected.current = true;
        router.replace(next);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router, search]);

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-muted mt-1">Access your knowledge, assessments, and certificates.</p>
      <div className="mt-6">
        <AuthForm mode="sign-in" />
      </div>
    </div>
  );
}

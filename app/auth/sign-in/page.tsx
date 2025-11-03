"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data?.session && !redirected.current) {
        redirected.current = true;
        router.replace("/dashboard");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session && !redirected.current) {
        redirected.current = true;
        router.replace("/dashboard");
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="text-muted mt-1">
        Access your knowledge, assessments, and certificates.
      </p>
      <div className="mt-6">
        <AuthForm mode="sign-in" />
      </div>
    </div>
  );
}

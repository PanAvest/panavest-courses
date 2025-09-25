"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AuthForm from "@/components/AuthForm";

const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      )
    : null;

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    // Immediate redirect if already signed in (refresh/return visit)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) router.replace("/dashboard");
    });

    // Redirect right after a successful sign-in
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session) {
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
        Access your courses, assessments, and certificates.
      </p>
      <div className="mt-6">
        <AuthForm mode="sign-in" />
      </div>
    </div>
  );
}

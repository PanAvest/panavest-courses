"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = { courseId: string; slug: string; className?: string };

type State =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "paid" }
  | { kind: "free_with_login" }
  | { kind: "unpaid" };

export default function EnrollCTA({ courseId, slug, className }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) { setState({ kind: "signed_out" }); return; }

      const { data: course } = await supabase
        .from("courses")
        .select("free_for_logged_in")
        .eq("id", courseId)
        .maybeSingle();
      if (course?.free_for_logged_in === true) {
        setState({ kind: "free_with_login" });
        return;
      }

      const { data: enr, error } = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (error) {
        // If no row yet, treat as unpaid (user needs to enroll)
        setState({ kind: "unpaid" });
        return;
      }

      setState(enr?.paid ? { kind: "paid" } : { kind: "unpaid" });
    })();
    return () => { mounted = false; };
  }, [courseId]);

  if (state.kind === "loading") {
    return (
      <button
        disabled
        className={`rounded-lg bg-brand text-white px-5 py-3 font-semibold opacity-70 cursor-wait ${className ?? ""}`}
      >
        Checking…
      </button>
    );
  }

  if (state.kind === "signed_out") {
    const redirect = encodeURIComponent(`/knowledge/${slug}`);
    return (
      <div className={`flex flex-wrap gap-3 ${className ?? ""}`}>
        <Link
          href={`/auth/sign-in?redirect=${redirect}`}
          className="rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90"
        >
          Sign in to Enroll
        </Link>
        <Link
          href={`/auth/sign-up?redirect=${redirect}`}
          className="rounded-xl px-5 py-3 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
        >
          Create account
        </Link>
      </div>
    );
  }

  if (state.kind === "paid") {
    return (
      <Link
        href={`/knowledge/${slug}/dashboard`}
        className={`rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 ${className ?? ""}`}
      >
        Go to Dashboard
      </Link>
    );
  }

  if (state.kind === "free_with_login") {
    return (
      <Link
        href={`/knowledge/${slug}/dashboard`}
        className={`rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 ${className ?? ""}`}
      >
        Start Program
      </Link>
    );
  }

  // unpaid
  return (
    <Link
      href={`/knowledge/${slug}/enroll`}
      className={`rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 ${className ?? ""}`}
    >
      Enroll to Begin
    </Link>
  );
}

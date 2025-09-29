"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  courseId: string;
  slug: string;
  className?: string;
};

type State =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "paid" }
  | { kind: "unpaid" };

export default function EnrollCTA({ courseId, slug, className }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!user) {
        setState({ kind: "signed_out" });
        return;
      }

      const { data: enr } = await supabase
        .from("enrollments")
        .select("paid")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (enr?.paid) setState({ kind: "paid" });
      else setState({ kind: "unpaid" });
    })();

    return () => { mounted = false; };
  }, [courseId]);

  if (state.kind === "loading") {
    return (
      <button
        className={`rounded-lg bg-brand text-white px-5 py-3 font-semibold opacity-70 cursor-wait ${className ?? ""}`}
        disabled
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
          className="rounded-lg px-5 py-3 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30"
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

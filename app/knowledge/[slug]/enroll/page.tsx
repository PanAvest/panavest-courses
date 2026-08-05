"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import PageSkeleton from "@/components/PageSkeleton";
import { supabase } from "@/lib/supabaseClient";
import CurrencySelector from "@/components/currency/CurrencySelector";
import Money from "@/components/currency/Money";

type Course = {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency?: string;
  free_for_logged_in?: boolean;
};

function isMissingFreeColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { code?: string; message?: string; details?: string; hint?: string };
  const text = `${rec.message ?? ""} ${rec.details ?? ""} ${rec.hint ?? ""}`.toLowerCase();
  if (!text.includes("free_for_logged_in")) return false;
  if (rec.code === "42703" || rec.code === "PGRST204") return true;
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find");
}

export default function EnrollPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const search = useSearchParams();

  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>("");

  // Auth
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
      setEmail(user.email ?? "");
    })();
  }, [router]);

  // Load course
  useEffect(() => {
    (async () => {
      if (!params?.slug) return;
      let c: Course | null = null;
      const primary = await supabase
        .from("courses")
        .select("id,slug,title,price,currency,free_for_logged_in")
        .eq("slug", String(params.slug))
        .maybeSingle();
      if (!primary.error) {
        c = primary.data as Course | null;
      } else if (isMissingFreeColumnError(primary.error)) {
        const fallback = await supabase
          .from("courses")
          .select("id,slug,title,price,currency")
          .eq("slug", String(params.slug))
          .maybeSingle();
        c = fallback.data as Course | null;
      }

      if (!c) { router.push("/knowledge"); return; }

      setCourse({
        ...c,
        price: Number(c.price ?? 0),
        currency: c.currency ?? "GHS",
        free_for_logged_in: Boolean(c.free_for_logged_in ?? false),
      });
      setLoading(false);
    })();
  }, [params?.slug, router]);

  // Free-with-login course: grant enrollment row and skip payment page.
  useEffect(() => {
    if (!userId || !course?.id || !course.free_for_logged_in) return;
    let cancelled = false;
    (async () => {
      setNotice("This program is free with login. Redirecting…");
      await supabase.from("enrollments").upsert(
        { user_id: userId, course_id: course.id, paid: false },
        { onConflict: "user_id,course_id" },
      );
      if (!cancelled) {
        router.replace(`/knowledge/${course.slug}/dashboard`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, course, router]);

  // If user returned from Paystack, verify immediately (supports ?reference=... or ?trxref=...)
  useEffect(() => {
    const ref = search.get("reference") || search.get("trxref");
    const shouldVerify = search.get("verify") === "1" && !!ref;
    if (!shouldVerify) return;

    (async () => {
      try {
        const res = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(ref!)}`, { cache: "no-store" });
        const data = await res.json();
        if (data?.ok) {
          setNotice("Payment verified. Redirecting…");
          router.replace(`/knowledge/${params.slug}/dashboard`);
        } else {
          setNotice(data?.error || data?.message || "Could not verify payment yet. If you were charged, the webhook will sync shortly.");
        }
      } catch {
        setNotice("Verification failed. If charged, it will auto-resolve via webhook shortly.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Pay with Paystack
  async function payNow() {
    if (!userId || !email || !course) return;
    if (course.free_for_logged_in) {
      setNotice("This program is free with login. Redirecting…");
      await supabase.from("enrollments").upsert(
        { user_id: userId, course_id: course.id, paid: false },
        { onConflict: "user_id,course_id" },
      );
      router.replace(`/knowledge/${course.slug}/dashboard`);
      return;
    }

    try {
      setNotice("Redirecting to Paystack…");

      // Paystack requires minor units (pesewas), so GHS 100.00 => 10000
      const amountMinor = Math.round(Number(course.price) * 100);

      const res = await fetch("/api/payments/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amountMinor,
          meta: {
            kind: "course",
            user_id: userId,
            course_id: course.id,
            slug: params.slug, // used by server / callback
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotice(data?.error || "Failed to initialize payment.");
        return;
      }

      // Send user to hosted checkout
      window.location.href = data.authorization_url;
    } catch {
      setNotice("Something went wrong starting the payment. Please try again.");
    }
  }

  if (loading || !course) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-screen-md px-4 md:px-6 py-10">
      <h1 className="text-2xl font-bold">Enroll: {course.title}</h1>
      <p className="mt-2 text-muted">
        {course.free_for_logged_in
          ? "This program is free for any logged-in account."
          : "Pay once to unlock this course with your account."}
      </p>

      <div className="mt-6 rounded-xl bg-white border border-[color:var(--color-light)]/40 p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold">
            {course.free_for_logged_in
              ? "Total: Free with login"
              : <span>Total: <Money amountGhs={course.price} /></span>}
          </div>
          {!course.free_for_logged_in && <CurrencySelector compact />}
        </div>
        {!course.free_for_logged_in && (
          <div className="mt-2 rounded-lg bg-[color:var(--color-bg)] px-3 py-2 text-xs text-muted">
            Paystack will charge <span className="font-semibold text-ink">GHS {course.price.toFixed(2)}</span>. Other currencies are display estimates from Frankfurter.
          </div>
        )}

        <button
          type="button"
          onClick={payNow}
          className="mt-4 rounded-lg bg-[color:var(--color-brand)] text-white px-5 py-2 font-semibold hover:opacity-90"
        >
          {course.free_for_logged_in ? "Start Program" : "Enroll (Mobile Money/Card)"}
        </button>

        {!!notice && <div className="mt-3 text-sm">{notice}</div>}
      </div>
    </div>
  );
}

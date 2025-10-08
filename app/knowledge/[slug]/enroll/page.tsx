"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Course = { id: string; slug: string; title: string; price: number; currency?: string };

export default function EnrollPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();

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
      const { data: c } = await supabase
        .from("courses")
        .select("id,slug,title,price,currency")
        .eq("slug", String(params.slug))
        .maybeSingle();

      if (!c) { router.push("/knowledge"); return; }

      setCourse({
        ...c,
        price: Number(c.price ?? 0),
        currency: c.currency ?? "GHS",
      });
      setLoading(false);
    })();
  }, [params?.slug, router]);

  // Pay with Paystack
  async function payNow() {
    if (!userId || !email || !course) return;

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
            slug: params.slug, // used by server to redirect back nicely
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
    } catch (err) {
      setNotice("Something went wrong starting the payment. Please try again.");
    }
  }

  if (loading || !course) return <div className="mx-auto max-w-screen-lg px-4 py-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-screen-md px-4 md:px-6 py-10">
      <h1 className="text-2xl font-bold">Enroll: {course.title}</h1>
      <p className="mt-2 text-muted">Pay once to unlock this course with your account.</p>

      <div className="mt-6 rounded-2xl bg-white border border-light p-5">
        <div className="text-lg font-semibold">
          Total: {course.currency || "GHS"} {course.price.toFixed(2)}
        </div>

        <button
          type="button"
          onClick={payNow}
          className="mt-4 rounded-lg bg-[#0a1156] text-white px-5 py-2 font-semibold hover:opacity-90"
        >
          Pay with Paystack
        </button>

        {!!notice && <div className="mt-3 text-sm">{notice}</div>}
      </div>
    </div>
  );
}

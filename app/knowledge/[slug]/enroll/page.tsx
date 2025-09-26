"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Course = { id: string; slug: string; title: string; price: number | null; img: string | null };

export default function EnrollPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [course, setCourse] = useState<Course | null>(null);
  const [method, setMethod] = useState<"momo"|"card">("momo");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("courses").select("id,slug,title,price,img").eq("slug", String(slug)).maybeSingle();
      setCourse(c);
      setLoading(false);
    })();
  }, [slug]);

  async function ensureAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/sign-in");
      return null;
    }
    return user;
  }

  async function payNow() {
    const user = await ensureAuth();
    if (!user || !course) return;
    setPaying(true);

    // MOCK PAYMENT: record a successful payment + enrollment (paid=true)
    await supabase.from("payments").insert({
      user_id: user.id,
      course_id: course.id,
      amount: course.price ?? 0,
      currency: "GHS",
      method,
      provider: method === "momo" ? "MobileMoney" : "Card",
      status: "paid",
      ref: \`MOCK-\${Date.now()}\`
    });

    // Upsert enrollment
    await supabase.from("enrollments").upsert({
      user_id: user.id,
      course_id: course.id,
      paid: true,
      progress_pct: 0
    }, { onConflict: "user_id,course_id" });

    setPaying(false);
    router.push(\`/knowledge/\${course.slug}/dashboard\`);
  }

  if (loading) return <div className="mx-auto max-w-screen-sm px-4 py-10">Loading…</div>;
  if (!course) return <div className="mx-auto max-w-screen-sm px-4 py-10">Not found.</div>;

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-10">
      <h1 className="text-2xl font-bold">Enroll & Pay</h1>
      <div className="mt-2 text-muted">Program: <span className="font-medium text-ink">{course.title}</span></div>
      <div className="mt-1">Amount: <span className="font-semibold">GH₵{Number(course.price ?? 0).toFixed(2)}</span></div>

      <div className="mt-6">
        <div className="text-sm font-semibold">Payment Method</div>
        <div className="mt-2 grid gap-2">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="method" checked={method==="momo"} onChange={()=>setMethod("momo")} />
            <span>Mobile Money (All Networks)</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="method" checked={method==="card"} onChange={()=>setMethod("card")} />
            <span>Debit/Credit Card</span>
          </label>
        </div>
      </div>

      <button
        onClick={payNow}
        disabled={paying}
        className="mt-6 rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {paying ? "Processing…" : "Pay Now (Mock)"}
      </button>

      <p className="mt-3 text-xs text-muted">
        This is a temporary payment placeholder. We’ll plug in the real gateway later.
      </p>
    </div>
  );
}

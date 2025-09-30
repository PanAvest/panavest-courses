"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function DemoCheckoutPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const ebookId = sp.get("ebookId") ?? "";
  const slug = sp.get("slug") ?? "";
  const amountStr = sp.get("amount") ?? "0";
  const currency = sp.get("currency") ?? "GHS";

  const amount = useMemo(() => Number(amountStr) || 0, [amountStr]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Require auth; if not signed in, send user to sign-in and bounce back here
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        const redirect = encodeURIComponent(`/payments/demo-checkout?${sp.toString()}`);
        router.replace(`/auth/sign-in?redirect=${redirect}`);
        return;
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router, sp]);

  async function confirmPayment() {
    setPaying(true);
    try {
      // Record a "paid" purchase (demo)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const redirect = encodeURIComponent(`/payments/demo-checkout?${sp.toString()}`);
        router.replace(`/auth/sign-in?redirect=${redirect}`);
        return;
      }

      // Ensure table: ebook_purchases(user_id uuid, ebook_id uuid, status text)
      await supabase.from("ebook_purchases").upsert(
        { user_id: user.id, ebook_id: ebookId, status: "paid" },
        { onConflict: "user_id,ebook_id" }
      );

      // Go back to the ebook page (unlocks preview + download)
      router.replace(`/ebooks/${encodeURIComponent(slug)}?paid=1`);
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-screen-sm px-4 py-10">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-screen-sm px-4 py-10">
      <h1 className="text-2xl font-bold">Demo Checkout</h1>
      <p className="mt-2 text-muted">Program: <span className="font-medium">{slug}</span></p>
      <p className="mt-1">Amount: <span className="font-semibold">{currency} {(amount/100).toFixed(2)}</span></p>

      <button
        onClick={confirmPayment}
        disabled={paying || !ebookId || !slug}
        className="mt-6 rounded-lg bg-brand text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {paying ? "Processing…" : "Pay Now (Mock)"}
      </button>

      <div className="mt-6">
        <Link href={`/ebooks/${encodeURIComponent(slug)}`} className="underline">
          Cancel and go back
        </Link>
      </div>

      <p className="mt-4 text-xs text-muted">
        Demo flow: payment writes a <code>paid</code> row to <code>ebook_purchases</code> for your account.
      </p>
    </main>
  );
}

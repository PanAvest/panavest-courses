"use client";

import { useState } from "react";
import { createPasswordRecoveryClient } from "@/lib/supabaseClient";

const supabase = typeof window !== "undefined" ? createPasswordRecoveryClient() : null;

export default function ResetRequestClient() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!supabase) {
      setErr("Client not ready. Please refresh and try again.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset/confirm`,
      });
      if (error) throw error;
      setMsg("Check your email for a reset link. Use it to set a new password.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="text-muted mt-1">Enter your email to receive a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl bg-white p-6 border border-[color:var(--color-light)]/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 border border-[color:var(--color-light)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {err && <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-[color:var(--color-text-muted)]">
        Remembered your password? <a href="/auth/sign-in" className="underline">Return to sign in</a>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : (null as any);

type Mode = "sign-in" | "sign-up";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const title = mode === "sign-in" ? "Sign In" : "Create Account";
  const cta = mode === "sign-in" ? "Sign In" : "Sign Up";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);

    if (!supabase) {
      setErr("Client not ready. Try refreshing the page.");
      setBusy(false);
      return;
    }

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/sign-in` },
        });
        if (error) throw error;
        setMsg("Account created. Check your email to verify, then sign in.");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-[color:var(--color-light)]">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
        {mode === "sign-in" ? "Welcome back!" : "Start your PanAvest journey."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={6}
            className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {err && <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Please wait..." : cta}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-[color:var(--color-text-muted)]">
        {mode === "sign-in" ? (
          <>Don&apos;t have an account? <a href="/auth/sign-up" className="underline">Sign up</a></>
        ) : (
          <>Already have an account? <a href="/auth/sign-in" className="underline">Sign in</a></>
        )}
      </div>
    </div>
  );
}

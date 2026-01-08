"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

const supabase = typeof window !== "undefined" ? getSupabaseClient() : null;

type Stage = "checking" | "ready" | "error" | "done";

export default function ResetConfirmClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [stage, setStage] = useState<Stage>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const code = search.get("code") || search.get("access_token");

  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      if (!supabase) {
        if (mounted) {
          setError("Client not ready. Refresh and try again.");
          setStage("error");
        }
        return;
      }
      if (!code) {
        if (mounted) {
          setError("Reset link is missing or invalid.");
          setStage("error");
        }
        return;
      }
      try {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) throw exErr;
        if (mounted) setStage("ready");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (mounted) {
          setError(message);
          setStage("error");
        }
      }
    };
    prepare();
    return () => {
      mounted = false;
    };
  }, [code]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!supabase) {
      setError("Client not ready. Refresh and try again.");
      return;
    }
    setBusy(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      setStage("done");
      setMsg("Password updated. You can now sign in.");
      setTimeout(() => router.push("/auth/sign-in"), 1200);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="text-muted mt-1">Use the link from your email to update your password.</p>

      <div className="mt-6 rounded-xl bg-white p-6 border border-[color:var(--color-light)]/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
        {stage === "checking" && (
          <div className="text-sm text-[color:var(--color-text-muted)]">Verifying your reset link…</div>
        )}

        {stage === "error" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">
              {error ?? "Unable to verify reset link."}
            </div>
            <a href="/auth/reset" className="text-sm underline text-[color:var(--color-brand)]">
              Request a new reset link
            </a>
          </div>
        )}

        {stage === "ready" && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <label className="block">
              <span className="text-sm">New password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 border border-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{error}</div>}
            {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        {stage === "done" && (
          <div className="space-y-3">
            {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}
            <div className="text-sm text-[color:var(--color-text-muted)]">
              Redirecting you to sign in…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

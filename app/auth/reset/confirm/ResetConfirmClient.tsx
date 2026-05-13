"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPasswordRecoveryClient } from "@/lib/supabaseClient";

const supabase = typeof window !== "undefined" ? createPasswordRecoveryClient() : null;

type Stage = "checking" | "ready" | "error" | "done";

export default function ResetConfirmClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [stage, setStage] = useState<Stage>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      try {
        const params = readRecoveryParams();

        if (params.accessToken && params.refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (sessionErr) throw sessionErr;
        } else if (params.tokenHash) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: params.tokenHash,
          });
          if (verifyErr) throw verifyErr;
        } else if (params.code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeErr) throw exchangeErr;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("Reset link is missing or invalid. Request a new reset link from this website.");
          }
        }

        if (mounted) setStage("ready");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (mounted) {
          setError(friendlyResetError(message));
          setStage("error");
        }
      }
    };
    prepare();
    return () => {
      mounted = false;
    };
  }, [search]);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (!supabase) {
      setError("Client not ready. Refresh and try again.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      window.localStorage.removeItem("panavest:password-recovery-started-at");
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
                className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 border border-[color:var(--color-light)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="••••••••"
              />
            </label>

            <label className="block">
              <span className="text-sm">Retype new password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 border border-[color:var(--color-light)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
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

function readRecoveryParams() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    code: query.get("code") || hash.get("code") || "",
    tokenHash:
      query.get("token_hash") ||
      query.get("token_hashes") ||
      hash.get("token_hash") ||
      "",
    accessToken: query.get("access_token") || hash.get("access_token") || "",
    refreshToken: query.get("refresh_token") || hash.get("refresh_token") || "",
  };
}

function friendlyResetError(message: string) {
  if (message.toLowerCase().includes("code verifier")) {
    return "This reset link was opened without its browser verification data. Request a new reset link from this website, then open the latest email link.";
  }
  return message;
}

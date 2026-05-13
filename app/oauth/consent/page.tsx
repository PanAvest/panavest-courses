"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageSkeleton from "@/components/PageSkeleton";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type ConsentParams = {
  client_id: string;
  redirect_uri: string;
  state?: string | null;
  scope?: string | null;
  response_type?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: string | null;
};

export default function ConsentPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="narrow" />}>
      <ConsentInner />
    </Suspense>
  );
}

function ConsentInner() {
  const router = useRouter();
  const qs = useSearchParams();
  const params = useMemo<ConsentParams>(() => {
    return {
      client_id: qs.get("client_id") || "",
      redirect_uri: qs.get("redirect_uri") || "",
      state: qs.get("state"),
      scope: qs.get("scope"),
      response_type: qs.get("response_type"),
      code_challenge: qs.get("code_challenge"),
      code_challenge_method: qs.get("code_challenge_method"),
    };
  }, [qs]);

  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace(`/auth/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (!cancelled) {
        setEmail(user.email ?? null);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const authorizeUrl = useMemo(() => {
    if (!supabaseUrl) return "";
    const url = new URL("/auth/v1/oauth/authorize", supabaseUrl);
    url.searchParams.set("client_id", params.client_id);
    url.searchParams.set("redirect_uri", params.redirect_uri);
    if (params.state) url.searchParams.set("state", params.state);
    if (params.scope) url.searchParams.set("scope", params.scope);
    if (params.response_type) url.searchParams.set("response_type", params.response_type);
    if (params.code_challenge) url.searchParams.set("code_challenge", params.code_challenge);
    if (params.code_challenge_method) url.searchParams.set("code_challenge_method", params.code_challenge_method);
    return url.toString();
  }, [params, supabaseUrl]);

  function handleDeny() {
    const { redirect_uri, state } = params;
    if (!redirect_uri) {
      setErr("Missing redirect_uri; cannot complete denial.");
      return;
    }
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    window.location.href = url.toString();
  }

  function handleAllow() {
    if (!authorizeUrl) {
      setErr("Supabase URL is not configured.");
      return;
    }
    // Uses Supabase auth cookie/session to authorize; Supabase will redirect back to redirect_uri
    window.location.href = authorizeUrl;
  }

  if (!ready) {
    return <PageSkeleton variant="narrow" />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-xl bg-white p-6 border border-[color:var(--color-light)]/40 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <p className="text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">PanAvest OAuth</p>
        <h1 className="mt-1 text-2xl font-semibold">Allow access?</h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          App <span className="font-semibold">{params.client_id || "Unknown App"}</span> is requesting access.
        </p>

        <div className="mt-4 rounded-xl bg-[color:var(--color-light)]/60 px-3 py-3 text-sm">
          <p className="font-medium text-[color:var(--color-brand)]">Signed in as</p>
          <p className="text-[color:var(--color-text-muted)]">{email || "Unknown user"}</p>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p className="font-medium">Requested scopes</p>
          <div className="rounded-xl border border-[color:var(--color-light)]/40 bg-[color:var(--color-light)]/40 px-3 py-2 shadow-sm">
            {(params.scope || "profile").split(" ").map((scope) => (
              <span
                key={scope}
                className="mr-2 inline-flex items-center rounded-full bg-[color:var(--color-brand)]/10 px-2 py-1 text-xs font-semibold text-[color:var(--color-brand)]"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>

        {err && <div className="mt-4 rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{err}</div>}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleDeny}
            className="w-full rounded-xl bg-white px-4 py-2 font-semibold text-[color:var(--color-brand)] shadow-sm transition-shadow duration-200 hover:shadow-md sm:w-auto focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
          >
            Deny
          </button>
          <button
            type="button"
            onClick={handleAllow}
            className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 font-semibold text-white hover:opacity-90 sm:w-auto"
          >
            Allow
          </button>
        </div>

        <div className="mt-4 text-xs text-[color:var(--color-text-muted)]">
          Redirect URI: <span className="font-mono">{params.redirect_uri || "not provided"}</span>
        </div>

        <div className="mt-4 text-sm text-[color:var(--color-text-muted)]">
          Need help? <Link className="underline" href="/auth/sign-in">Return to sign in</Link>
        </div>
      </div>
    </div>
  );
}

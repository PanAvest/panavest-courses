"use client";

import { useEffect } from "react";
import { createPasswordRecoveryClient } from "@/lib/supabaseClient";

export default function RecoveryRedirect() {
  useEffect(() => {
    let mounted = true;
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = query.get("type") || hash.get("type");

    if (type === "recovery") {
      const target = `/auth/reset/confirm${window.location.search}${window.location.hash}`;
      window.location.replace(target);
      return;
    }

    const hasRecoveryTokens =
      hash.has("access_token") ||
      hash.has("refresh_token") ||
      query.has("token_hash") ||
      query.has("code");

    if (hasRecoveryTokens) {
      const target = `/auth/reset/confirm${window.location.search}${window.location.hash}`;
      window.location.replace(target);
      return;
    }

    const supabase = createPasswordRecoveryClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted || !data.session) return;

      const recoveryStartedAt = window.localStorage.getItem("panavest:password-recovery-started-at");
      if (!recoveryStartedAt) return;

      const ageMs = Date.now() - Number(recoveryStartedAt);
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 60 * 60 * 1000) {
        window.location.replace("/auth/reset/confirm");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}

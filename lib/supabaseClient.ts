/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // cache the browser client across HMR to prevent multiple GoTrueClient instances
  var __kds_supabase__: SupabaseClient | undefined;
}

/** ───────────── Browser singleton ───────────── */
function getBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getBrowserClient() should only be called in the browser.");
  }
  if (globalThis.__kds_supabase__) return globalThis.__kds_supabase__!;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const client = createClient(url, anon, {
    db: { schema: "public" },
    auth: {
      storageKey: "kds-auth-v1",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    global: { fetch },
  });

  // keep realtime channels in sync with auth
  client.auth.onAuthStateChange((_e, s) => (client as any)?.realtime?.setAuth?.(s?.access_token ?? ""));

  globalThis.__kds_supabase__ = client;
  return client;
}

/** ───────────── Isomorphic export (same import everywhere) ───────────── */
function createIsomorphicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (typeof window === "undefined") {
    // server: no session persistence
    return createClient(url, anon, {
      db: { schema: "public" },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    });
  }
  return getBrowserClient();
}

export const supabase = createIsomorphicClient();

/** Optional server-only service client (unchanged signature) */
export function getServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("getServiceClient() must only be used on the server.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, {
    db: { schema: "public" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
}

export default getBrowserClient;

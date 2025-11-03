/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * KDS Supabase — Isomorphic + Browser Singleton (v2)
 * - Browser: single shared client across HMR (avoids multiple GoTrueClient)
 * - Server: lightweight client (no session persistence)
 * - No calls to non-existent auth methods (e.g., auth.update)
 */

declare global {
  // eslint-disable-next-line no-var
  var __kds_supabase__: SupabaseClient | undefined;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

/** Server-safe client (no session persistence) */
function getServerClient(): SupabaseClient {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    db: { schema: "public" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
    global: { fetch },
  });
}

/** Browser singleton client (persisted session) */
function getBrowserClient(): SupabaseClient {
  // If called on server by accident, fall back safely
  if (typeof window === "undefined") return getServerClient();

  if (globalThis.__kds_supabase__) return globalThis.__kds_supabase__!;

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

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

  // Keep realtime channels in sync with auth
  client.auth.onAuthStateChange((_e, s) => {
    (client as any)?.realtime?.setAuth?.(s?.access_token ?? "");
  });

  globalThis.__kds_supabase__ = client;
  return client;
}

/** Use this everywhere */
export const supabase: SupabaseClient =
  typeof window === "undefined" ? getServerClient() : getBrowserClient();

/** Optional server-only service client (never import in the browser) */
export function getServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("getServiceClient() must only be used on the server.");
  }
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, service, {
    db: { schema: "public" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
    global: { fetch },
  });
}

// Optional: keep default export if other files rely on it
export default getBrowserClient;

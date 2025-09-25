import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __pa_supabase__: SupabaseClient | undefined;
}

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseClient() called on server. Use server admin helper instead.");
  }
  if (globalThis.__pa_supabase__) return globalThis.__pa_supabase__;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const client = createClient(url, anon, {
    auth: { persistSession: true, storageKey: "pa-auth", autoRefreshToken: true },
  });

  if (process.env.NODE_ENV !== "production") globalThis.__pa_supabase__ = client;
  return client;
}

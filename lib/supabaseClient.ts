/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
declare global { var __kds_supabase__: SupabaseClient | undefined; }
let browserClient: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") throw new Error("getSupabaseClient() should only be called in the browser.");
  if (globalThis.__kds_supabase__) return (browserClient = globalThis.__kds_supabase__);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  browserClient = createClient(url, anon, {
    db: { schema: "public" },
    auth: { storageKey: "kds-auth-v1", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    global: { fetch },
  });
  browserClient.auth.onAuthStateChange((_e, s) => (browserClient as any)?.realtime?.setAuth?.(s?.access_token ?? ""));
  globalThis.__kds_supabase__ = browserClient;
  return browserClient;
}
function createIsomorphicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (typeof window === "undefined") {
    return createClient(url, anon, { db: { schema: "public" }, auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } });
  }
  return getSupabaseClient();
}
export const supabase = createIsomorphicClient();
export function getServiceClient() {
  if (typeof window !== "undefined") throw new Error("getServiceClient() must only be used on the server.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { db: { schema: "public" }, auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } });
}
export default getSupabaseClient;

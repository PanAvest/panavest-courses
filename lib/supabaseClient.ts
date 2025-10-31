/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** ───────────── BROWSER SINGLETON (unchanged behavior) ───────────── */
let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseClient() should only be called in the browser.");
  }
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    browserClient = createClient(url, anon, {
      db: { schema: "public" },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: { fetch },
    });

    // Keep Realtime channels authenticated when the session changes
    browserClient.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? "";
      (browserClient as any)?.realtime?.setAuth?.(token);
    });
  }
  return browserClient;
}

/** ───────────── ISOMORPHIC EXPORT (fixes build) ─────────────
 * On the server, we create a safe, non-persisting client with the anon key.
 * In the browser, we return the cached browser singleton above.
 * This preserves `import { supabase } ...` everywhere without touching other files.
 */
function createIsomorphicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (typeof window === "undefined") {
    // Server-side: safe client for SSR/Route Handlers (no session persistence)
    return createClient(url, anon, {
      db: { schema: "public" },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    });
  }

  // Browser: use the regular cached client
  return getSupabaseClient();
}

/** Keep existing named export without triggering browser-only code at import time */
export const supabase = createIsomorphicClient();

/** Optional: server-only elevated client if you already use it somewhere */
export function getServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("getServiceClient() must only be used on the server.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, service, {
    db: { schema: "public" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
}

export default getSupabaseClient;

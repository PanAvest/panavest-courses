/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Get (or create) a singleton Supabase client using the public anon key (BROWSER ONLY). */
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
      // TS-safe call; works across supabase-js versions
      (browserClient as any)?.realtime?.setAuth?.(token);
    });
  }
  return browserClient;
}

/** Named export used across the app: `import { supabase } from "@/lib/supabaseClient"` */
export const supabase = getSupabaseClient();

/** Optional: server-only client for API routes / server actions (never import in client code). */
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

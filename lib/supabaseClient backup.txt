/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** ───────────── BROWSER SINGLETON (safe) ───────────── */
let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  // If someone calls this on the server by mistake, fall back to a server client
  if (typeof window === "undefined") return getServerClient();

  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // DO NOT crash the UI; log and stand up a harmless dummy client.
    // This lets pages render so you can debug with /api/debug-env etc.
    console.error(
      "[KDS] NEXT_PUBLIC_SUPABASE_* missing in client bundle. Using a dummy client (no auth/realtime)."
    );
    browserClient = createClient("https://example.supabase.co", "public-anon-key", {
      db: { schema: "public" },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
      global: { fetch },
    });
  } else {
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
  }

  // Keep Realtime channels authenticated when the session changes
  browserClient.auth.onAuthStateChange((_event, session) => {
    const token = session?.access_token ?? "";
    (browserClient as any)?.realtime?.setAuth?.(token);
  });

  return browserClient;
}

/** ───────────── SERVER CLIENT (strict) ───────────── */
function getServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    db: { schema: "public" },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "pkce" },
    global: { fetch },
  });
}

/** ───────────── ISOMORPHIC EXPORT (no import-time throws on client) ───────────── */
function createIsomorphicClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server path: strict (catches misconfig during build/API execution)
    return getServerClient();
  }
  // Browser path: soft (never throws, avoids white-screen)
  return getSupabaseClient();
}

/** Keep existing named export */
export const supabase = createIsomorphicClient();

/** Optional: server-only elevated client */
export function getServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("getServiceClient() must only be used on the server.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, {
    db: { schema: "public" },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "pkce" },
    global: { fetch },
  });
}

export default getSupabaseClient;

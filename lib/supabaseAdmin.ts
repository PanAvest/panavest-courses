import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Safe-at-build-time admin client.
 * If env is missing during build, export `null` instead of throwing.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient<unknown, unknown, unknown> | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Get (or create) a singleton Supabase client using the public anon key. */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    client = createClient(url, anon);
  }
  return client;
}

/** Named export to satisfy `import { supabase } from "@/lib/supabaseClient"`. */
export const supabase = getSupabaseClient();
export default getSupabaseClient;

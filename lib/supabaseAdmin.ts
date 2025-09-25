import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) throw new Error("Missing Supabase URL or SERVICE_ROLE key");

export const supabaseAdmin = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

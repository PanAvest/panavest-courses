import "server-only";

import { cookies } from "next/headers";
import {
  createRouteHandlerClient,
  createServerActionClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/**
 * Centralised helpers for creating typed Supabase clients on the server.
 * Each helper ensures we only touch cookies/server APIs from a server context,
 * so importing this file in a client bundle will error immediately.
 */
export type SupabaseServerClient = SupabaseClient<Database, "public">;

const context = { cookies };

export function getSupabaseServerComponentClient(): SupabaseServerClient {
  return createServerComponentClient<Database, "public">(context);
}

export function getSupabaseServerActionClient(): SupabaseServerClient {
  return createServerActionClient<Database, "public">(context);
}

export function getSupabaseRouteHandlerClient(): SupabaseServerClient {
  return createRouteHandlerClient<Database, "public">(context);
}

/** Default export matches the most common usage (server components/loaders). */
export default getSupabaseServerComponentClient;

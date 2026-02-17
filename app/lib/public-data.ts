import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type EbookRow = Database["public"]["Tables"]["ebooks"]["Row"];
type PartnerLogo = { src: string; alt: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;

function getSupabaseAnonClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!supabase) {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "pkce" },
      global: { fetch },
    });
  }
  return supabase;
}

const partnerFiles = ["Artboard 1.png", "Artboard 2.png", "Artboard 3.png", "Artboard 4.png", "Artboard 5.png"];

function prettifyAlt(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base.replace(/[_-]+/g, " ").trim() || "Partner";
}

export function getPartnersCached(): Promise<PartnerLogo[]> {
  return unstable_cache(
    async () => partnerFiles.map((file) => ({ src: `/Partners/${file}`, alt: prettifyAlt(file) })),
    ["public:partners"],
    { revalidate: 600, tags: ["public:partners"] }
  )();
}

export function getPublicCoursesHome(limit = 6): Promise<CourseRow[]> {
  return unstable_cache(
    async () => {
      const client = getSupabaseAnonClient();
      const { data, error } = await client
        .from("courses")
        .select("id, slug, title, description, img, cpd_points, published, free_for_logged_in, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("[KDS] courses home fetch failed", error);
        return [];
      }
      return (data ?? []) as CourseRow[];
    },
    [`public:courses:home:${limit}`],
    { revalidate: 300, tags: ["public:courses"] }
  )();
}

export function getPublicCoursesCatalog(): Promise<CourseRow[]> {
  return unstable_cache(
    async () => {
      const client = getSupabaseAnonClient();
      const { data, error } = await client
        .from("courses")
        .select("id, slug, title, description, img, price, cpd_points, published, free_for_logged_in")
        .eq("published", true)
        .order("title", { ascending: true });
      if (error) {
        console.error("[KDS] courses catalog fetch failed", error);
        return [];
      }
      return (data ?? []) as CourseRow[];
    },
    ["public:courses:catalog"],
    { revalidate: 600, tags: ["public:courses"] }
  )();
}

export function getPublicEbooksHome(limit = 8): Promise<EbookRow[]> {
  return unstable_cache(
    async () => {
      const client = getSupabaseAnonClient();
      const { data, error } = await client
        .from("ebooks")
        .select("id, slug, title, description, cover_url, price_cents, published, free_for_logged_in, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("[KDS] ebooks home fetch failed", error);
        return [];
      }
      return (data ?? []) as EbookRow[];
    },
    [`public:ebooks:home:${limit}`],
    { revalidate: 300, tags: ["public:ebooks"] }
  )();
}

export function getSiteSettingsCached(): Promise<Record<string, unknown> | null> {
  return unstable_cache(
    async () => {
      const client = getSupabaseAnonClient();
      const { data, error } = await client.from("site_settings").select("*").limit(1);
      if (error) {
        console.error("[KDS] site_settings fetch failed", error);
        return null;
      }
      return data?.[0] ?? null;
    },
    ["public:site_settings"],
    { revalidate: 600, tags: ["public:site_settings"] }
  )();
}

export type { PartnerLogo };

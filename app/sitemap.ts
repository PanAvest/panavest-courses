import type { MetadataRoute } from "next";
import { defaultCanonicalBase } from "./seo-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = defaultCanonicalBase.replace(/\/+$/, "");

  const staticRoutes = ["/", "/knowledge", "/about", "/ebooks"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  // NOTE: Dynamic course URLs from /knowledge/[slug] are NOT included yet.
  // Once there is a server-safe way to list all active slugs (e.g., from Supabase on the server),
  // extend this sitemap to include them.

  return staticRoutes;
}

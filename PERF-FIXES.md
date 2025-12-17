Performance fixes applied

- Routing/rendering
  - `/` stays ISR (`revalidate=60`) and now edge runtime (cookie-free data sources).
  - `/knowledge` now ISR (`revalidate=600`) and edge runtime.
  - `/auth/sign-in` now static/edge (no server auth lookup).

- Supabase read caching
  - Added `app/lib/public-data.ts` with `unstable_cache` wrappers (revalidate 300–600s, tags `public:courses`, `public:ebooks`, `public:site_settings`, `public:partners`).
  - `/` uses `getPublicCoursesHome(6)`, `getPublicEbooksHome(8)`, `getPartnersCached()`.
  - `/knowledge` uses `getPublicCoursesCatalog()`.
  - `/api/public/site-settings` now serves cached settings via `getSiteSettingsCached()`.

- Edge/runtime safety
  - Public pages use only anon Supabase + static partner manifest; no cookies/headers/Node-only APIs.

- LCP & assets
  - Converted hero assets: `Boardroom.webp` (~716 KB, was 6.0 MB) and `hero-illustration.webp` (~228 KB, was 2.8 MB); PSD moved to `design-source/hero-illustration.psd`.
  - Updated `<Image>` sizes for hero and catalog cards to avoid overserving on mobile.

- Public asset bloat note
  - Added `public/interactive/README.md` to document legacy interactive payloads; keep until migrated to Supabase Storage/CDN.

Cache windows
- Courses home/ebooks home: 300s
- Courses catalog: 600s
- Site settings: 600s
- Partners manifest: 600s

PASS/FAIL SUMMARY  
| Item | Status | Notes |  
| --- | --- | --- |  
| Route rendering mode | FAIL | Public pages forced dynamic; ISR only on `/` |  
| Edge runtime | FAIL | No edge usage on Ghana-facing routes |  
| Supabase query caching | FAIL | All reads uncached/SSR hits Supabase directly |  
| Auth checks vs TTFB | PASS | Auth checks run client-side after mount |  
| Middleware | PASS | Basic auth only; no network I/O |  
| LCP image handling | FAIL | Hero uses multi-MB assets without optimization |

Top 5 fixes
1) Make public catalog routes static/ISR (`/knowledge`, `/auth/sign-in`) instead of `force-dynamic`.  
2) Move Ghana-facing pages (`/`, `/knowledge`, `/auth/sign-in`) to the edge runtime to cut latency.  
3) Wrap Supabase reads in `unstable_cache` or route-level ISR where safe (courses/ebooks lists).  
4) Reduce hero assets: convert `Boardroom.jpg` and `hero-illustration.png` to compressed WebP/AVIF and add `sizes` tuned to layout.  
5) Trim `/public/interactive` and other >2MB images; serve lighter thumbnails for cards.

1) Route rendering mode — FAIL
- `app/page.tsx` (ISR 60s):  
```tsx
// app/page.tsx
export const revalidate = 60;
…
const [{ data: cData }, { data: eData }, partners] = await Promise.all([
  supabase.from("courses").select("id, slug, title, description, img, cpd_points, published, created_at").eq("published", true).order("created_at", { ascending: false }).limit(6),
  supabase.from("ebooks").select("id, slug, title, description, cover_url, price_cents, published, created_at").eq("published", true).order("created_at", { ascending: false }).limit(8),
  getPartners(),
]);
```
- `app/knowledge/page.tsx` (public catalog forced dynamic):  
```tsx
export const dynamic = "force-dynamic";
…
const { data: items } = await supabase
  .from("courses")
  .select("id,slug,title,description,img,price,cpd_points,published,delivery_mode,interactive_path")
  .eq("published", true)
  .order("title", { ascending: true });
```
- `app/auth/sign-in/page.tsx` (public but `force-dynamic` + `revalidate = 0`):  
```tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
…
<Suspense fallback={<div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-10">Loading sign-in…</div>}>
  <SignInClient />
</Suspense>
```
- Routes likely intended static/ISR but marked dynamic: `/knowledge`, `/auth/sign-in`, `/payments/demo-checkout`, auth reset pages. Only `/` uses ISR.

2) Edge runtime — FAIL
- No `export const runtime = "edge"` anywhere (only `runtime = "nodejs"` on APIs). Ghana-facing pages (`/`, `/knowledge`, `/auth/sign-in`) render on Node runtime → higher RTT for users in Accra/Kumasi.

3) Supabase query caching — FAIL
- No `unstable_cache`/`cache()` usage; all Supabase reads hit origin each request. Examples:
  - `app/page.tsx` (courses/ebooks lists), snippet above.
  - `app/knowledge/page.tsx` (course catalog, forced dynamic), snippet above.
  - `app/api/public/site-settings/route.ts` (settings endpoint, uncached):  
```ts
export async function GET() {
  …
  const { data, error } = await supabase.from("site_settings").select("*").limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ?? null);
}
```
- No fetch-level `next: { revalidate }` usage; critical reads (`/`, `/knowledge`) are uncached/dynamic instead of ISR/`unstable_cache`.

4) Auth checks vs TTFB — PASS
- Auth checks happen client-side after hydration (good for TTFB):
  - `app/auth/sign-in/SignInClient.tsx`:  
```tsx
useEffect(() => {
  let mounted = true;
  const go = async () => {
    const { data } = await supabase.auth.getSession();
    if (!mounted) return;
    const next = search.get("next") || "/dashboard";
    if (data?.session && !redirected.current) {
      redirected.current = true;
      router.replace(next);
    }
  };
  go();
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => { … });
  return () => { mounted = false; sub?.subscription.unsubscribe(); };
}, [router, search]);
```
- Other `supabase.auth.*` usages are in client components (`/dashboard`, `/knowledge/[slug]`, `/ebooks/[slug]`) after mount. One route handler (`app/api/certificates/[id]/refresh/route.ts`) checks session server-side but not during page render.

5) Middleware — PASS
- `middleware.ts` limits admin routes via Basic auth; no Supabase/network I/O:  
```ts
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (!(p.startsWith("/admin") || p.startsWith("/api/admin"))) return NextResponse.next();
  …
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) return unauthorized();
  if (u !== process.env.ADMIN_USER || pw !== process.env.ADMIN_PASS) return unauthorized();
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
```

6) LCP image handling — FAIL
- Hero uses multi-MB assets with `priority` but without compression or tailored `sizes`:
  - `app/page.tsx` hero background:  
```tsx
<Image
  src="/Boardroom.jpg"
  alt=""
  fill
  priority
  sizes="100vw"
  quality={95}
  className="object-cover object-center"
/>
…
<Image
  src="/hero-illustration.png"
  alt="KDS learning preview"
  width={1600}
  height={1200}
  priority
  className="h-auto w-full"
/>
```
- Course cards use large defaults without `sizes` (e.g., `app/knowledge/page.tsx` uses 1200×900 per card), likely overserving on mobile.
- Largest public assets (top 10):  
  - `public/hero-illustration.psd` 7.8MB  
  - `public/Boardroom.jpg` 6.0MB  
  - `public/hero-illustration.png` 2.8MB  
  - `public/project-management.png` 2.7MB  
  - `public/introduction-to-marketing.png` 2.3MB  
  - `public/vercel.png` 2.2MB  
  - `public/data-analysis-with-python.png` 2.2MB  
  - `public/leadership-development.png` 2.1MB  
  - `public/mobile.png` 1.2MB  
  - `public/interactive/ghie-business-ethics/mobile/6IfNbVSTpHF_DX2060_DY2060_CX1543_CY868.png` 688KB  
  (Plus 100+MB under `public/interactive/ghie-business-ethics/`.)

Current setup
- Tailwind: yes (`@import "tailwindcss";` in `app/globals.css`), Tailwind v4 inline theme tokens present. Global CSS imported in `app/layout.tsx`.
- Global CSS: `app/globals.css` includes custom keyframes (`fade-up`, `float`, marquee) and utility classes (`.animate-fade-up`, `.animate-float`); prefers-reduced-motion override already present for marquee.
- Animation libs: No `framer-motion` or other animation packages in dependencies. No Tailwind animate plugin found; only custom keyframes in CSS.

Target locations
- `app/page.tsx` (Home): Server Component, `export const runtime = "edge"`, ISR (revalidate 60). Sections: hero, KDS mobile block, Featured Knowledge cards, E-Books cards, Reviews.
- `app/knowledge/page.tsx`: Server Component, `runtime = "edge"`, ISR (revalidate 600). Main section: catalog grid of course cards.
- Shared layout: `app/layout.tsx` (RootLayout) imports `Header`/`Footer` (client components) but page bodies remain server-rendered/edge. No shared section wrapper with animations yet.

Approach options (ranked)
- Option A: CSS-only fade-in on initial load using existing `animate-fade-up`.
  - Complexity: Low. Add className to sections/cards in Server Components.
  - Risk: Low for SSR/Edge/ISR (pure CSS). Potential flash if animation runs before load; mitigated by `prefers-reduced-motion` guard.
  - Code location: apply utility from `app/globals.css` in `app/page.tsx` and `app/knowledge/page.tsx`.
- Option B: Tailwind-only keyframes (arbitrary values or extend theme).
  - Complexity: Low/Med. Define keyframes in CSS (already present) or via Tailwind theme. Similar behavior to Option A but keeps Tailwind utility style.
  - Risk: Low; works in Server Components/Edge. Need to ensure class names are static (no dynamic class generation on server).
  - Code location: `app/globals.css` (keyframes) + Tailwind class usage in pages.
- Option C: Scroll-reveal via IntersectionObserver (small client wrapper).
  - Complexity: Med. Create a `FadeInOnView` client component that adds a CSS class when intersecting.
  - Risk: Low/Med for SSR/Edge (JS runs client-side only). Must guard `prefers-reduced-motion` and hydration (initial class should match server).
  - Code location: new `components/FadeInOnView.tsx` (client); wrap sections/cards in `app/page.tsx` and `app/knowledge/page.tsx`.
- Option D: Framer Motion.
  - Complexity: Med/High if added. Not installed; would increase bundle size and edge cold start.
  - Risk: Added dependency; unnecessary for simple fades. Not recommended for performance goals.

Recommendation
- Use Option A/B: leverage existing `animate-fade-up` CSS (or a Tailwind utility alias) for initial-load fade on key sections/cards. Minimal code, zero bundle cost, Edge-safe.
- If scroll reveal is desired, add a tiny client IntersectionObserver wrapper (Option C) with `prefers-reduced-motion` opt-out and server-safe initial state.

Minimal implementation plan (no code yet)
1) Reuse `animate-fade-up` from `app/globals.css`; apply to hero/right visual, mobile block, cards in Featured Knowledge/E-Books, and the catalog grid in `app/knowledge/page.tsx`.
2) Optional: create `components/FadeInOnView.tsx` (client) that toggles `data-visible`/`animate-fade-up` on intersection; ensure default class matches server to avoid hydration mismatch.
3) Respect `prefers-reduced-motion` (already in globals; add guard in IntersectionObserver if implemented).

Post-implementation checks
- `npm run lint`
- `npm run build`
- Manual: verify `/` and `/knowledge` render on Edge/ISR without hydration warnings; confirm fade runs once and respects reduced-motion settings.

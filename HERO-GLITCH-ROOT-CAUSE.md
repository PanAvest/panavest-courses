Hero background pop-in investigation (no code changes)

1) Hero implementation (app/page.tsx)
- Hero section: `app/page.tsx` hero uses `<section className="relative isolate overflow-hidden bg-white">` with an absolutely positioned background image wrapper.
- Background layer: `div` with `className="absolute inset-0 -z-10 hidden md:block"` containing `<Image src="/Boardroom.webp" alt="" fill priority sizes="100vw" className="object-cover object-center" />` plus two gradient overlay divs.
- Foreground: content grid (`max-w-screen-2xl ... grid ...`) with hero text and right visual image (`/hero-illustration.webp`, also `priority`).

2) Animation/opacity triggers
- The hero background wrapper itself has no animation classes, but the foreground blocks use `animate-fade-up`. The background container is `hidden md:block` (no mobile image). Background remains visible at large breakpoints once displayed.
- Existing custom CSS for `.animate-fade-up` (in `app/globals.css`) animates from `opacity:0` and `translateY(12px)` to visible; applied to hero text block and hero illustration wrapper. These animations do not target the background image layer, but the foreground fades in.

3) Next/Image configuration
- Background image uses `fill`, `priority`, `sizes="100vw"`, no placeholder/blur (defaults to empty). Large asset now WebP (~716 KB) but still loaded at runtime.
- Right hero illustration image also `priority`; two priority images compete for early bandwidth.
- Background rendered only on `md` and above (`hidden md:block`), meaning on first desktop paint the element becomes visible immediately without pre-render on mobile.

4) Hydration/DOM swap risks
- `app/page.tsx` is a Server Component; hero is static. No client-side conditional beyond the responsive `hidden md:block`. Foreground uses `animate-fade-up` but remains server-rendered. No Suspense around hero.
- No client hooks affect hero; no hydration mismatch expected aside from responsive display toggling.

5) Most likely cause of pop-in
- The background image likely “pops” because the `hidden md:block` wrapper prevents pre-rendering below `md` and the large priority fill image has no blur placeholder. On load at `md+` widths, the background starts invisible (pending image download) and appears once decoded; simultaneous `priority` hero illustration may compete, delaying the background and creating a visible pop. Foreground fade draws attention to the late background draw.

Secondary contributors
- Two `priority` images (bg + illustration) competing for early fetch slots.
- No placeholder/blur for the background fill image, so initial paint shows empty background until decoded.
- Background only exists on `md`+; on resize or first desktop render, there is no small fallback, so it renders after first frame.

Minimal fix plan (do not implement yet)
- Add `placeholder="blur"` with a small blurDataURL for `/Boardroom.webp` and keep `priority` to avoid blank background while decoding.
- Consider removing `priority` from the illustration or the background (keep one priority) to reduce contention.
- Remove `hidden md:block` for the background or provide a lightweight mobile background (e.g., low-res WebP) so the background is present at first paint across breakpoints.

How to reproduce and verify
1) In Chrome DevTools: Disable cache, Throttle to “Fast 3G”, load `/`; watch the Network tab for `/Boardroom.webp` and `/hero-illustration.webp` priorities and decode timing. Observe the first paint in the Elements tab (background absent then appears).
2) Record a Performance profile with screenshots; check when the background image paints relative to first contentful paint.
3) Toggle viewport widths (mobile → desktop) with “Preserve log” to see the `hidden md:block` reflow; note if background inserts late. Repeat after applying blur/priority adjustments to confirm reduced pop.***

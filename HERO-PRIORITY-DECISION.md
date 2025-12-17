Hero priority & LCP decision (no code changes)

1) Likely LCP candidate (app/page.tsx hero)
- Background image: absolute `fill` `/Boardroom.webp` inside `.absolute inset-0 -z-10 hidden md:block`. Covers full viewport width/height on desktop, but hidden on mobile (`hidden md:block`). On desktop, this is visually dominant behind the hero; it can register as LCP if it paints after text.
- Foreground illustration: `<Image src="/hero-illustration.webp" width={1600} height={1200} priority sizes="(min-width: 1280px) 50vw, 100vw" className="h-auto w-full" />` in a max-width ~620px container. On desktop, it’s a large visible element and likely to be LCP when the background is already painted or hidden.
- Text block: large heading/subtext; could be LCP if images delay, but the illustration/background are more likely to be largest painted element on desktop. On mobile (background hidden), the illustration may still be the LCP; text could become LCP if images are slow.

2) Hero images and props
- Background: `<Image src="/Boardroom.webp" alt="" fill priority sizes="100vw" className="object-cover object-center" />` (no placeholder). Hidden on mobile via `hidden md:block`; shows on desktop only.
- Illustration: `<Image src="/hero-illustration.webp" alt="KDS learning preview" width={1600} height={1200} priority sizes="(min-width: 1280px) 50vw, 100vw" className="h-auto w-full" />`.
- Both are marked `priority`, competing for early load.

3) Recommendation
- Keep ONE priority: make the foreground illustration the single priority image for consistent LCP across breakpoints, since it is always visible (mobile+desktop) and sits in the visible column. Remove `priority` from the background or demote it.
- Add a blur placeholder to the background if it remains; otherwise demote it to non-priority with optional `placeholder="blur"` to avoid pop-in. The current `hidden md:block` is acceptable if a lightweight placeholder is used; alternatively provide a small mobile-friendly background so it exists at first paint.
- Final decision: foreground illustration priority; background non-priority with blur placeholder (and optionally visible on mobile) to reduce pop-in and contention.***

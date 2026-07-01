// Presentational, server-safe hero visual (no "use client", no hooks, no events).
// A stylised wireframe GLOBE with Africa highlighted as the hero continent and other
// landmasses faint, plus subtle premium motion (slow sheen, orbiting markers, a gentle
// Africa glow) — all CSS, and disabled under prefers-reduced-motion. The four credential
// cards are real HTML: they float around the orbit on xl+, and stack/grid below xl.

const RED = "#b65437"; // brand red (primary)
const GOLD = "#f5b750"; // gold (badge / highlight)
const RING = "#d9ad47"; // orbit + graticule gold
const ORANGE = "#e08a5f"; // lighter accent orange
const INK = "#2c2522"; // ink text
const MUTED = "#6d7d6f"; // muted text

// Africa silhouette in 0..800 space; re-scaled onto the globe below.
const AFRICA =
  "M250 202 L374 186 L478 190 L514 202 L526 230 L534 278 L562 306 L626 326 " +
  "L574 358 L538 402 L522 454 L514 502 L490 550 L446 598 L410 614 L374 590 " +
  "L362 526 L374 474 L354 434 L326 422 L262 420 L202 402 L174 354 L198 298 L226 242 Z";

// Faint neighbouring continents (Africa-centred globe view), authored in globe space.
const EUROPE = "M366 270 L356 252 L378 242 L400 250 L420 240 L444 248 L458 262 L440 268 L448 282 L424 278 L410 288 L392 278 L378 284 Z";
const WASIA = "M500 312 L522 298 L558 300 L588 290 L582 312 L548 320 L520 322 Z";
const ARABIA = "M548 322 L588 330 L598 352 L578 374 L556 366 L546 344 Z";
const INDIA = "M590 372 L626 378 L610 404 L598 430 L590 400 Z";
const SAMERICA = "M246 352 L258 386 L250 424 L242 460 L232 496 L222 518 L212 498 L212 458 L216 420 L226 384 L234 360 Z";

const MEDAL = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-1/2 w-1/2" aria-hidden>
    <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM8.5 13.6 7 22l5-2.6L17 22l-1.5-8.4A6.98 6.98 0 0 1 12 15a6.98 6.98 0 0 1-3.5-1.4z" />
  </svg>
);
const BOOK = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-1/2 w-1/2" aria-hidden>
    <path d="M21 5c-1.9-.8-4-1-6-1s-4.1.2-6 1c-1.9-.8-4-1-6-1v14c2 0 4.1.2 6 1 1.9-.8 4-1 6-1s4.1.2 6 1V5zM11 18.4c-1.6-.5-3.3-.7-5-.7V6c1.7 0 3.4.2 5 .7v11.7zm2 0V6.7c1.6-.5 3.3-.7 5-.7v11.7c-1.7 0-3.4.2-5 .7z" />
  </svg>
);
const LOCK = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-1/2 w-1/2" aria-hidden>
    <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 8H9V6a3 3 0 1 1 6 0v3z" />
  </svg>
);
const SEAL = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-1/2 w-1/2" aria-hidden>
    <path d="M12 1 3 5v6c0 5 3.8 9.4 9 11 5.2-1.6 9-6 9-11V5l-9-4zm-1.2 14.2L7.4 11.8l1.4-1.4 2 2 4.2-4.2 1.4 1.4-5.6 5.6z" />
  </svg>
);

type Card = {
  title: string;
  sub: string;
  badgeBg: string;
  badgeFg: string;
  icon: React.ReactNode;
  pos: string;
  delay: string;
};

const CARDS: Card[] = [
  { title: "Quality Management Principles", sub: "Inspired by ISO 9001 best practices", badgeBg: RED, badgeFg: "#fff", icon: MEDAL, pos: "top-[1%] right-[-1%]", delay: "0s" },
  { title: "CPD Assessment Pathway", sub: "Designed for future accreditation readiness", badgeBg: GOLD, badgeFg: INK, icon: SEAL, pos: "top-[16%] left-[-3%]", delay: "0.6s" },
  { title: "Educational Management Approach", sub: "Informed by ISO 21001 principles", badgeBg: GOLD, badgeFg: INK, icon: BOOK, pos: "top-[55%] right-[-3%]", delay: "1.2s" },
  { title: "Information Security Practices", sub: "Guided by ISO/IEC 27001 principles", badgeBg: RED, badgeFg: "#fff", icon: LOCK, pos: "bottom-[6%] left-[-2%]", delay: "1.8s" },
];

function CredentialCard({ c }: { c: Card }) {
  return (
    <div className="flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-[color:var(--color-light)] bg-white p-3 shadow-[0_14px_34px_-16px_rgba(44,37,34,0.4)]">
      <span
        className="grid aspect-square w-9 shrink-0 place-items-center rounded-xl sm:w-10"
        style={{ backgroundColor: c.badgeBg, color: c.badgeFg }}
      >
        {c.icon}
      </span>
      <div className="min-w-0 leading-snug">
        <div className="text-[12.5px] font-bold sm:text-[13.5px]" style={{ color: INK }}>{c.title}</div>
        <div className="mt-0.5 text-[10.5px] sm:text-[11.5px]" style={{ color: MUTED }}>{c.sub}</div>
      </div>
    </div>
  );
}

// Graticule ellipses (parallels) — full flat ellipses read as a glass-globe wireframe.
const PARALLELS = [
  { cy: 330, rx: 187, ry: 30 }, { cy: 470, rx: 187, ry: 30 },
  { cy: 268, rx: 150, ry: 24 }, { cy: 532, rx: 150, ry: 24 },
  { cy: 224, rx: 95, ry: 15 }, { cy: 576, rx: 95, ry: 15 },
];

export default function HeroVisual() {
  return (
    <div
      className="relative mx-auto w-full max-w-[560px] xl:max-w-none"
      role="img"
      aria-label="A globe highlighting Africa. KDS programmes are designed around ISO 9001, ISO 21001 and ISO/IEC 27001 principles, with a CPD assessment pathway"
    >
      {/* ---- Emblem: globe + orbit + accents. Capped on large screens. ---- */}
      <div className="relative mx-auto aspect-square w-full max-w-[260px] min-[420px]:max-w-[300px] sm:max-w-[360px] xl:max-w-[500px] 2xl:max-w-[560px]">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 800 800" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <clipPath id="hv-globe"><circle cx="400" cy="400" r="200" /></clipPath>
            <radialGradient id="hv-sphere" cx="38%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#fffdf7" />
              <stop offset="58%" stopColor="#f7eeda" />
              <stop offset="100%" stopColor="#ecd8b4" />
            </radialGradient>
            <radialGradient id="hv-africa" cx="44%" cy="38%" r="72%">
              <stop offset="0%" stopColor={GOLD} />
              <stop offset="100%" stopColor={RED} />
            </radialGradient>
            <radialGradient id="hv-sheen" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hv-term" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2c2522" stopOpacity="0.14" />
              <stop offset="72%" stopColor="#2c2522" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hv-orange" cx="34%" cy="28%" r="85%">
              <stop offset="0%" stopColor={ORANGE} />
              <stop offset="100%" stopColor={RED} />
            </radialGradient>
            <radialGradient id="hv-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={GOLD} stopOpacity="0.14" />
              <stop offset="70%" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* soft glow behind the globe */}
          <circle cx="400" cy="400" r="255" fill="url(#hv-glow)" />

          {/* outer credential orbit rings */}
          <g fill="none" stroke={RING}>
            <circle cx="400" cy="400" r="372" strokeWidth="1.6" strokeDasharray="4 9" opacity="0.5" />
            <circle cx="400" cy="400" r="288" strokeWidth="1.5" opacity="0.42" />
          </g>

          {/* orbiting credential markers (two counter-rotating layers) */}
          <g className="hv-orbit">
            <circle cx="586" cy="78" r="6.5" fill={GOLD} />
            <circle cx="131" cy="302" r="6" fill={RED} />
            <circle cx="648" cy="543" r="5.5" fill={GOLD} />
          </g>
          <g className="hv-orbit-2">
            <circle cx="112" cy="586" r="5.5" fill={RED} />
            <circle cx="640" cy="250" r="5" fill={RED} />
            <circle cx="330" cy="120" r="4.5" fill={GOLD} />
          </g>

          {/* ---------- GLOBE ---------- */}
          <circle cx="400" cy="400" r="200" fill="url(#hv-sphere)" />
          <g clipPath="url(#hv-globe)">
            {/* graticule */}
            <g fill="none" stroke={RING} strokeWidth="1.15" opacity="0.34">
              <line x1="200" y1="400" x2="600" y2="400" />
              <line x1="400" y1="200" x2="400" y2="600" />
              <ellipse cx="400" cy="400" rx="68" ry="200" />
              <ellipse cx="400" cy="400" rx="134" ry="200" />
              {PARALLELS.map((p, i) => (
                <ellipse key={i} cx="400" cy={p.cy} rx={p.rx} ry={p.ry} />
              ))}
            </g>

            {/* faint neighbouring continents */}
            <g fill={RING} opacity="0.2">
              <path d={EUROPE} />
              <path d={WASIA} />
              <path d={ARABIA} />
              <path d={INDIA} />
              <path d={SAMERICA} />
              <ellipse cx="478" cy="522" rx="8" ry="22" transform="rotate(-18 478 522)" />
            </g>

            {/* Africa — the highlighted hero continent (gentle glow pulse) */}
            <g transform="translate(152 167) scale(0.62)">
              <path className="hv-africa" d={AFRICA} fill="url(#hv-africa)" />
              <path d={AFRICA} fill="none" stroke={RED} strokeOpacity="0.5" strokeWidth="2.2" strokeLinejoin="round" />
            </g>

            {/* static top-left sheen for volume */}
            <circle cx="336" cy="326" r="168" fill="url(#hv-sheen)" />
            {/* slow rotating terminator → suggests the globe turning */}
            <g className="hv-glint">
              <circle cx="560" cy="470" r="150" fill="url(#hv-term)" />
            </g>
          </g>
          {/* globe rim */}
          <circle cx="400" cy="400" r="200" fill="none" stroke={RING} strokeWidth="1.6" opacity="0.55" />

          {/* decorative red dot grid (upper-left) */}
          <g fill={RED} opacity="0.42">
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={`g-${i}`} cx={70 + (i % 5) * 13} cy={150 + Math.floor(i / 5) * 13} r="2.1" />
            ))}
          </g>
          {/* a couple of twinkling stars for life */}
          <circle className="hv-twinkle" cx="700" cy="250" r="3" fill={GOLD} />
          <circle className="hv-twinkle" cx="150" cy="470" r="2.6" fill={RED} style={{ animationDelay: "1.6s" }} />

          {/* overlapping accent orbs, lower-right (fully visible) */}
          <circle cx="672" cy="676" r="94" fill="url(#hv-orange)" />
          <circle cx="566" cy="706" r="52" fill={ORANGE} opacity="0.9" />
        </svg>

        {/* ---- xl+: cards float around the orbit ---- */}
        <div className="hidden xl:block">
          {CARDS.map((c) => (
            <div key={c.title} className={`animate-float absolute w-[14.5rem] 2xl:w-[15.5rem] ${c.pos}`} style={{ animationDelay: c.delay }}>
              <CredentialCard c={c} />
            </div>
          ))}
        </div>
      </div>

      {/* ---- below xl: tidy stack (phones) / 2-col grid (tablets) ---- */}
      <div className="mx-auto mt-6 grid max-w-[520px] grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
        {CARDS.map((c) => (
          <CredentialCard key={c.title} c={c} />
        ))}
      </div>

      {/* ---- Statement, near the badges on every screen ---- */}
      <p className="mx-auto mt-5 max-w-[520px] text-center text-[10.5px] leading-snug xl:mt-6 xl:text-left" style={{ color: `${INK}70` }}>
        KDS is designed with ISO-informed principles for quality, education, and information
        security as part of our ongoing certification-readiness journey.
      </p>
    </div>
  );
}

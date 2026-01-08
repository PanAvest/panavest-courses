# PanAvest Knowledge Development Series (KDS)
## Ghana Copyright Documentation Pack

## 0. Document Metadata
- Document Timestamp: 2026-01-08 12:07 GMT
- Software Version: KDS v1.0
- Document Purpose: Evidence of authorship and originality only; not developer documentation

## 1. Purpose
This document serves as legal evidence of authorship and originality for the PanAvest Knowledge Development Series (KDS) software.
It intentionally excludes full implementation details and is not intended to enable deployment, replication, or reverse engineering.

## 2. Work Identification and Authorship
- Software Title: PanAvest Knowledge Development Series (KDS)
- Author: Kennedy Abubakar
- DOB: 30/04/2001
- Email: kennedyabu85@gmail.com
- Location: Greater Accra - Adenta
- Rights Holder: PanAvest International & Partners
- Type of Work: Software / Web Application (Literary Work - Act 690)
- Date Of Project Completion: [Not provided]

## 3. Creation Overview and Intended Use
KDS is a web-based knowledge development platform created to deliver professional learning content, structured learning paths, and related educational resources.
The system is intended for learners, corporate teams, and administrators who manage and consume curated knowledge content.
This overview is intentionally high-level to preserve proprietary design and workflow details.

## 4. High-Level Architecture
### 4.1 Frontend
- Web user interface that presents learning content, navigation, and interactive views.
- Client-side components for visual structure, layout, and user interaction.

### 4.2 Backend
- Server-side services that provide content delivery, data access, and application coordination.
- Business logic and data handling are intentionally omitted from this submission.

### 4.3 Admin
- Internal management interface for content organization, publishing control, and operational oversight.
- Administrative workflows are described at a high level only.

### 4.4 Mobile
- Responsive web experience designed to support mobile browsers.
- No native mobile source code is included in this repository.

## 5. Technology Stack Summary (No Configs or Secrets)
- Languages: TypeScript, JavaScript, CSS
- Frameworks: Next.js, React
- Styling: Tailwind CSS
- Data and services: Supabase client SDKs
- Validation: Zod
- Document and media utilities: pdfjs-dist, jsPDF, html2canvas
- Content sanitization: DOMPurify
- Analytics and performance insights: Vercel Analytics, Vercel Speed Insights
- Tooling: TypeScript, ESLint, Prettier, Sharp

## 6. High-Level Folder Tree (Non-Exhaustive)
```
/ (repository root)
- app/
  - about/
  - admin/
  - ai/
  - api/ (redacted content)
  - auth/
  - courses/
  - dashboard/
  - ebooks/
  - knowledge/
  - leaderboard/
  - payments/ (redacted content)
  - privacy/
  - settings/
  - terms/
  - verify/ (redacted content)
- components/
- lib/
- public/
- docs/
- db/
- scripts/
- supabase/
- types/
- design-source/
- backups/
- Interactive Courses/
- PanAvest Ai/
```

## 7. Representative Original Code Excerpts (Non-Executable, Redacted)
All excerpts below are partial, illustrative, and intentionally non-executable. Sensitive or proprietary logic is redacted.

### 7.1 Progress Indicator UI (components/ProgressBar.tsx)
```tsx
/* EXCERPT: components/ProgressBar.tsx */
const pct = Math.max(0, Math.min(100, Math.round(value)));
// WHAT: Uses a clamped percentage to render the fill width of a progress bar.
return (
  <div className="w-full h-3 rounded-full bg-[color:var(--color-light)] overflow-hidden" aria-label="Progress">
    <div className="h-full bg-brand transition-[width] duration-500" style={{width: `${pct}%`}} />
  </div>
);
// REDACTED: component wrapper and export omitted
```

### 7.2 Partner Marquee UI (components/home/PartnersMarquee.tsx)
```tsx
/* EXCERPT: components/home/PartnersMarquee.tsx */
if (!partners.length) return null;
// WHAT: Renders a horizontally scrolling list of partner logos when data exists.
return (
  <section className="py-8 sm:py-10">
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
      <div className="text-center text-[11px] tracking-[0.25em] text-ink/50">PARTNERS</div>

      <div className="partners-logos mt-6">
        {[0, 1].map((dup) => (
          <div key={`slide-${dup}`} className="partners-logos-slide">
            {partners.map((partner) => (
              <div
                key={`${partner.src}-${dup}`}
                className="partners-logo-item inline-flex items-center justify-center px-4 sm:px-7 lg:px-8 w-1/2 sm:w-auto"
              >
                <Image src={partner.src} alt={partner.alt} width={320} height={160} loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
);
// REDACTED: component signature, imports, and auxiliary styling omitted
```

### 7.3 Global Layout Shell (app/layout.tsx)
```tsx
/* EXCERPT: app/layout.tsx */
// WHAT: Defines the global page shell and positions shared layout sections.
return (
  <html lang="en">
    <head>
      {/* REDACTED: proprietary or security-sensitive logic omitted */}
    </head>
    <body className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* REDACTED: proprietary or security-sensitive logic omitted */}
    </body>
  </html>
);
```

### 7.4 Visual Theme Tokens (app/globals.css)
```css
/* EXCERPT: app/globals.css */
/* WHAT: Establishes brand color tokens and base motion cues. */
:root {
  --color-bg: #fefdfa;
  --color-accent-red: #b65437;
  --color-accent-gold: #f5b750;
  --color-text-dark: #2c2522;
  --color-text-muted: #6d7d6f;
  --color-light: #f3e9e0;
  --color-soft: #d0c5be;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fade-up .6s ease-out both; }

/* REDACTED: additional global styles and component classes omitted */
```

## 8. Legal Declaration and Rights
I, Kennedy Abubakar, declare that the PanAvest Knowledge Development Series (KDS) software is an original work and that I am the author.
This submission is a partial and redacted disclosure for copyright registration evidence only.
Proprietary logic and trade secrets are intentionally excluded.
All rights remain exclusively with PanAvest International & Partners.
This submission complies with the Ghana Copyright Act 2005 (Act 690).

Signed: ______________________________
Name: Kennedy Abubakar
Date: ________________________________

## 9. Assumptions and Redactions
- Date Of Project Completion was not provided and is left blank for the rights holder to complete.
- Mobile delivery is assumed to be a responsive web interface because no native mobile source code was found in the repository.
- Code excerpts are partial and non-executable; sensitive and proprietary logic is intentionally omitted.

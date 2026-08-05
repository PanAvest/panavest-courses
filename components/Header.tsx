"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import logo from "@/public/logo.png";
import { getSupabaseClient } from "@/lib/supabaseClient";
import CurrencySelector from "@/components/currency/CurrencySelector";

// Browser-only Supabase client
const supabase: SupabaseClient | null = typeof window !== "undefined" ? getSupabaseClient() : null;

const STANDARDS = [
  { code: "ISO 9001",      name: "Quality Management",             status: "Aligned",          badge: "bg-emerald-500/20 text-emerald-400", iconColor: "#34d399" },
  { code: "ISO 21001",     name: "Educational Organizations",      status: "Informed",          badge: "bg-sky-500/20 text-sky-400",         iconColor: "#38bdf8" },
  { code: "ISO/IEC 27001", name: "Information Security",           status: "Aligned",          badge: "bg-emerald-500/20 text-emerald-400", iconColor: "#34d399" },
  { code: "CPD",           name: "Assessment-Based Certification", status: "Accredited-Ready", badge: "bg-amber-500/20 text-amber-400",     iconColor: "#fbbf24" },
];

function ShieldIcon({ color }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill={color ?? "currentColor"} aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-md p-1.5 text-[color:var(--color-ink)]/50 hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition"
    >
      {children}
    </a>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(Boolean(data?.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsAuthed(Boolean(session));
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase || signingOut) return;
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      setIsAuthed(false);
      window.location.assign("/");
    } catch {
      setSigningOut(false);
    }
  }, [signingOut]);

  return (
    <div className="w-full">
      {/* ── Accreditation strip ── */}
      <div className="hidden md:flex items-center justify-center h-8 border-b border-[color:var(--color-light)] bg-[color:var(--color-bg)]">
        <div className="flex items-center gap-5 xl:gap-7">
          {STANDARDS.map((s, i) => (
            <span key={s.code} className="flex items-center gap-1.5 text-[11px]">
              {i > 0 && (
                <span className="w-px h-3 bg-[color:var(--color-light)] mx-0.5" aria-hidden />
              )}
              <ShieldIcon color="var(--color-soft)" />
              <span className="font-semibold text-[color:var(--color-ink)]/50">{s.code}</span>
              <span className="hidden xl:inline text-[color:var(--color-ink)]/30">{s.name}</span>
              <span className="text-[color:var(--color-ink)]/35">— {s.status}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main navigation ── */}
      <header className="w-full bg-white border-b border-[color:var(--color-light)] shadow-[0_1px_4px_rgba(44,37,34,0.06)]">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-20 h-[4.75rem] sm:h-20 lg:h-[5rem] flex items-center justify-between gap-4">

          {/* Brand block */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 rounded-md"
            aria-label="PanAvest KDS — home"
          >
            <Image
              src={logo}
              alt="Knowledge Development Series"
              className="h-14 w-auto object-contain sm:h-16 lg:h-[4.5rem]"
              sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
              priority
              unoptimized
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <Link href="/knowledge" className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-ink)]/65 hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition">
              Knowledge
            </Link>
            <Link href="/ebooks" className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-ink)]/65 hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition">
              E-Books
            </Link>
            <Link href="/about" className="rounded-md px-3 py-2 text-sm font-medium text-[color:var(--color-ink)]/65 hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition">
              About
            </Link>
          </nav>

          {/* Social + auth */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Social icons */}
            <SocialLink href="https://x.com/PanAvest_Int" label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <path fill="currentColor" d="M18.244 3H21l-6.52 7.455L22.5 21h-5.93l-4.65-5.58L6.5 21H3.744l7.01-8.01L2.5 3h5.93l4.19 5.03L18.244 3Zm-2.08 16.2h1.64L7.9 4.71H6.2l9.964 14.49Z" />
              </svg>
            </SocialLink>
            <SocialLink href="https://www.instagram.com/panavest.inter.partners/?hl=en" label="Instagram">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <path fill="currentColor" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 2.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm4.75-2.75a.75.75 0 1 1-.75.75.75.75 0 0 1 .75-.75" />
              </svg>
            </SocialLink>
            <SocialLink href="https://www.linkedin.com/company/panavest-international-and-partners" label="LinkedIn">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zm7 0h3.8v1.64h.05A4.17 4.17 0 0 1 18.7 9c3.3 0 3.9 2.17 3.9 5v7h-4v-6.2c0-1.48-.03-3.39-2.07-3.39-2.07 0-2.39 1.62-2.39 3.29V21h-4z" />
              </svg>
            </SocialLink>
            <SocialLink href="https://www.facebook.com/profile.php?id=61581240303633" label="Facebook">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <path fill="currentColor" d="M13.5 21v-7H16l.5-3h-3V9.25c0-.87.24-1.47 1.5-1.47h1V5.09C15.7 5.06 14.9 5 14 5a3.6 3.6 0 0 0-3.86 3.95V11H7v3h3v7h3.5Z" />
              </svg>
            </SocialLink>

            {/* Divider */}
            <span className="mx-1 h-5 w-px bg-[color:var(--color-light)]" aria-hidden />

            <CurrencySelector compact />

            <span className="mx-1 h-5 w-px bg-[color:var(--color-light)]" aria-hidden />

            {/* Auth */}
            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg px-4 py-2 text-sm font-semibold bg-[color:var(--color-brand)] text-white hover:opacity-90 transition"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/40 disabled:opacity-60 transition"
                  aria-label="Sign out"
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </>
            ) : (
              <Link
                href="/auth/sign-in"
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-[color:var(--color-brand)] text-white hover:opacity-90 transition shadow-sm"
              >
                Join Now
              </Link>
            )}
          </div>

          {/* Mobile currency + hamburger */}
          <div className="lg:hidden flex shrink-0 items-center gap-1.5">
            <CurrencySelector compact />
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-[color:var(--color-ink)]/70 hover:bg-[color:var(--color-light)]/50 transition"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 18 18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      {open && (
        <div className="lg:hidden border-b border-[color:var(--color-light)] bg-white shadow-md">
          <div className="mx-auto max-w-screen-2xl px-4 2xl:px-20 py-4 flex flex-col gap-1">

            {/* Nav links */}
            <Link href="/knowledge" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition">
              Knowledge
            </Link>
            <Link href="/ebooks" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition">
              E-Books
            </Link>
            <Link href="/about" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-light)]/50 transition">
              About
            </Link>

            {/* Auth */}
            <div className="mt-2 flex flex-col gap-2">
              {isAuthed ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2.5 bg-[color:var(--color-brand)] text-white font-semibold text-sm text-center"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={async () => { setOpen(false); await handleSignOut(); }}
                    disabled={signingOut}
                    className="rounded-lg px-4 py-2.5 border border-[color:var(--color-light)] text-[color:var(--color-ink)] font-medium text-sm text-center disabled:opacity-60"
                    aria-label="Sign out"
                  >
                    {signingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2.5 bg-[color:var(--color-brand)] text-white font-semibold text-sm text-center"
                >
                  Join Now
                </Link>
              )}
            </div>

            {/* Social */}
            <div className="mt-3 pt-3 border-t border-[color:var(--color-light)]">
              <div className="flex items-center gap-2">
                <SocialLink href="https://x.com/PanAvest_Int" label="X (Twitter)">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M18.244 3H21l-6.52 7.455L22.5 21h-5.93l-4.65-5.58L6.5 21H3.744l7.01-8.01L2.5 3h5.93l4.19 5.03L18.244 3Zm-2.08 16.2h1.64L7.9 4.71H6.2l9.964 14.49Z" />
                  </svg>
                </SocialLink>
                <SocialLink href="https://www.instagram.com/panavest.inter.partners/?hl=en" label="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 2.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm4.75-2.75a.75.75 0 1 1-.75.75.75.75 0 0 1 .75-.75" />
                  </svg>
                </SocialLink>
                <SocialLink href="https://www.linkedin.com/company/panavest-international-and-partners" label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zm7 0h3.8v1.64h.05A4.17 4.17 0 0 1 18.7 9c3.3 0 3.9 2.17 3.9 5v7h-4v-6.2c0-1.48-.03-3.39-2.07-3.39-2.07 0-2.39 1.62-2.39 3.29V21h-4z" />
                  </svg>
                </SocialLink>
                <SocialLink href="https://www.facebook.com/profile.php?id=61581240303633" label="Facebook">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M13.5 21v-7H16l.5-3h-3V9.25c0-.87.24-1.47 1.5-1.47h1V5.09C15.7 5.06 14.9 5 14 5a3.6 3.6 0 0 0-3.86 3.95V11H7v3h3v7h3.5Z" />
                  </svg>
                </SocialLink>
              </div>
            </div>

            {/* Standards — compact mobile summary */}
            <div className="mt-3 pt-3 border-t border-[color:var(--color-light)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-ink)]/35 mb-2">Our Standards</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STANDARDS.map((s) => (
                  <span key={s.code} className="flex items-center gap-1.5 text-[11px]">
                    <ShieldIcon color="var(--color-soft)" />
                    <span className="font-medium text-[color:var(--color-ink)]/55">{s.code}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

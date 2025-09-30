"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import logo from "@/public/logo.png"; // high-res, static import

// --- Small helper for external social links ---
function SocialLink({
  href,
  label,
  children,
  className = "",
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-md p-1.5 ring-1 ring-[color:var(--color-light)] hover:bg-[color:var(--color-light)]/30 text-ink/80 hover:text-ink transition ${className}`}
    >
      {children}
    </a>
  );
}

// Browser-only Supabase client
const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

export default function Header() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    // Initial check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(Boolean(data?.session));
    });

    // Live updates
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
    <header className="w-full bg-[color:var(--color-bg)]">
      {/* Top bar */}
      <div className="w-full px-3 sm:px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Panavest home">
          <Image
            src={logo}
            alt="Panavest"
            className="h-16 md:h-20 w-auto"
            sizes="(max-width: 768px) 64px, 80px"
            priority
            unoptimized
          />
          <span className="sr-only">Panavest</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/courses" className="text-sm text-muted hover:text-ink">Knowledge</Link>
          <Link href="/about" className="text-sm text-muted hover:text-ink">About</Link>
          <Link href="/leaderboard" className="text-sm text-muted hover:text-ink">Leaderboard</Link>

          {/* Divider */}
          <span className="h-6 w-px bg-[color:var(--color-light)]/80" aria-hidden />

          {/* Social icons (compact) */}
          <div className="flex items-center gap-2">
            <SocialLink href="https://x.com/PanAvest_Int" label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M18.244 3H21l-6.52 7.455L22.5 21h-5.93l-4.65-5.58L6.5 21H3.744l7.01-8.01L2.5 3h5.93l4.19 5.03L18.244 3Zm-2.08 16.2h1.64L7.9 4.71H6.2l9.964 14.49Z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://www.instagram.com/panavest.inter.partners/?hl=en" label="Instagram">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.75-2.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://www.linkedin.com/company/panavest-international-and-partners" label="LinkedIn">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zm7 0h3.8v1.64h.05A4.17 4.17 0 0 1 18.7 9c3.3 0 3.9 2.17 3.9 5v7h-4v-6.2c0-1.48-.03-3.39-2.07-3.39-2.07 0-2.39 1.62-2.39 3.29V21h-4z"/>
              </svg>
            </SocialLink>
            <SocialLink href="https://www.facebook.com/profile.php?id=61581240303633" label="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path fill="currentColor" d="M13.5 21v-7H16l.5-3h-3V9.25c0-.87.24-1.47 1.5-1.47h1V5.09C15.7 5.06 14.9 5 14 5a3.6 3.6 0 0 0-3.86 3.95V11H7v3h3v7h3.5Z"/>
              </svg>
            </SocialLink>
          </div>

          {/* Auth buttons */}
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-sm rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-light)]/30 disabled:opacity-60"
                aria-label="Sign out"
              >
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            </>
          ) : (
            <Link
              href="/auth/sign-in"
              className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
            >
              Join Now
            </Link>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 ring-1 ring-black/10 hover:bg-black/[0.04]"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-light bg-[color:var(--color-bg)]">
          <div className="px-4 py-3 flex flex-col gap-3">
            <Link href="/courses" onClick={() => setOpen(false)} className="text-ink">Knowledge</Link>
            <Link href="/about" onClick={() => setOpen(false)} className="text-ink">About</Link>
            <Link href="/leaderboard" onClick={() => setOpen(false)} className="text-ink">Leaderboard</Link>

            {/* Social: mobile */}
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-ink/90">Connect</h4>
              <div className="mt-2 flex items-center gap-3">
                <SocialLink href="https://x.com/PanAvest_Int" label="X (Twitter)">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M18.244 3H21l-6.52 7.455L22.5 21h-5.93l-4.65-5.58L6.5 21H3.744l7.01-8.01L2.5 3h5.93l4.19 5.03L18.244 3Zm-2.08 16.2h1.64L7.9 4.71H6.2l9.964 14.49Z"/>
                  </svg>
                </SocialLink>
                <SocialLink href="https://www.instagram.com/panavest.inter.partners/?hl=en" label="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.75-2.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"/>
                  </svg>
                </SocialLink>
                <SocialLink href="https://www.linkedin.com/company/panavest-international-and-partners" label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zm7 0h3.8v1.64h.05A4.17 4.17 0 0 1 18.7 9c3.3 0 3.9 2.17 3.9 5v7h-4v-6.2c0-1.48-.03-3.39-2.07-3.39-2.07 0-2.39 1.62-2.39 3.29V21h-4z"/>
                  </svg>
                </SocialLink>
                <SocialLink href="https://www.facebook.com/profile.php?id=61581240303633" label="Facebook">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path fill="currentColor" d="M13.5 21v-7H16l.5-3h-3V9.25c0-.87.24-1.47 1.5-1.47h1V5.09C15.7 5.06 14.9 5 14 5a3.6 3.6 0 0 0-3.86 3.95V11H7v3h3v7h3.5Z"/>
                  </svg>
                </SocialLink>
              </div>
            </div>

            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg px-4 py-2 bg-brand text-white font-medium text-center"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    await handleSignOut();
                  }}
                  disabled={signingOut}
                  className="rounded-lg px-4 py-2 ring-1 ring-[color:var(--color-light)] bg-white text-ink font-medium text-center disabled:opacity-60"
                  aria-label="Sign out"
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </>
            ) : (
              <Link
                href="/auth/sign-in"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-lg px-4 py-2 bg-brand text-white font-medium text-center"
              >
                Join Now
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

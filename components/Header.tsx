"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import logo from "@/public/logo.png"; // high-res, static import

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
      // Hard redirect to clear any cached server state/layouts
      window.location.assign("/");
    } catch {
      setSigningOut(false);
    }
  }, [signingOut]);

  return (
    <header className="w-full bg-[color:var(--color-bg)]">
      {/* Full width row (no centered max-w), small side padding */}
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

            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-lg px-4 py-2 bg-brand text-white font-medium text-center"
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
                className="mt-1 rounded-lg px-4 py-2 bg-brand text-white font-medium text-center"
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

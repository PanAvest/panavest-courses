"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import logo from "@/public/logo.png";

/* ───────────────────────── Social Link Component ───────────────────────── */
function SocialLink({ href, label, children }: any) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-md p-1.5 ring-1 ring-[var(--color-light)] hover:bg-[var(--color-light)]/30 text-ink/80 hover:text-[#b65437] transition"
    >
      {children}
    </a>
  );
}

/* ───────────────────────── Paystack PCI Badge ───────────────────────── */
function PaystackSecureBadge() {
  return (
    <div className="hidden sm:flex items-center">
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md ring-1 ring-[var(--color-light)] bg-white/70 backdrop-blur text-[11px] text-[#0a0a0a]">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 1l9 5v6c0 5-4 9-9 11C7 21 3 17 3 12V6l9-5z" />
        </svg>
        Paystack Secure • PCI-DSS Level 1
      </span>
    </div>
  );
}

/* ───────────────────────── Supabase Client ───────────────────────── */
const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : null;

/* ───────────────────────── Header Component ───────────────────────── */
export default function Header() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const linkHover = "text-sm text-muted hover:text-[#b65437] hover:underline underline-offset-4 transition";

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthed(Boolean(data?.session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) =>
      setIsAuthed(Boolean(session))
    );

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
      <div className="w-full px-3 sm:px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src={logo} alt="Panavest" className="h-16 md:h-20 w-auto" priority unoptimized />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-8">
          <Link href="/courses" className={linkHover}>Knowledge</Link>
          <Link href="/about" className={linkHover}>About</Link>
          <Link href="/leaderboard" className={linkHover}>E-Books</Link>

          <PaystackSecureBadge />

          <span className="h-6 w-px bg-[color:var(--color-light)]/80" />

          <div className="flex items-center gap-2">
            {/* X */}
            <SocialLink href="https://x.com/PanAvest_Int" label="X">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18.244 3H21l-6.52 7.455L22.5 21h-5.93l-4.65-5.58L6.5 21H3.744l7.01-8.01L2.5 3h5.93l4.19 5.03L18.244 3Z"/></svg>
            </SocialLink>

            {/* Instagram */}
            <SocialLink href="https://www.instagram.com/panavest.inter.partners/?hl=en" label="Instagram">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"/></svg>
            </SocialLink>

            {/* LinkedIn */}
            <SocialLink href="https://www.linkedin.com/company/panavest-international-and-partners" label="LinkedIn">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5Z"/></svg>
            </SocialLink>

            {/* Facebook */}
            <SocialLink href="https://www.facebook.com/profile.php?id=61581240303633" label="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M13.5 21v-7H16l.5-3h-3"/></svg>
            </SocialLink>
          </div>

          {isAuthed ? (
            <>
              <Link href="/dashboard" className="rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90">Dashboard</Link>
              <button onClick={handleSignOut} disabled={signingOut} className="rounded-lg px-4 py-2 ring-1 ring-[var(--color-light)] bg-white hover:bg-[var(--color-light)]/30">
                {signingOut ? "…" : "Sign Out"}
              </button>
            </>
          ) : (
            <Link href="/auth/sign-in" className="rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90">Join Now</Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button onClick={() => setOpen(!open)} className="sm:hidden p-2 ring-1 ring-black/10 rounded-md">
          <svg width="22" height="22"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden border-t border-light px-4 py-4 flex flex-col gap-3 bg-[color:var(--color-bg)]">
          <Link href="/courses" onClick={() => setOpen(false)} className="text-ink">Knowledge</Link>
          <Link href="/about" onClick={() => setOpen(false)} className="text-ink">About</Link>
          <Link href="/leaderboard" onClick={() => setOpen(false)} className="text-ink">E-Books</Link>

          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs mt-2 rounded-md ring-1 ring-[var(--color-light)] bg-white/80">
            🔒 Paystack Secure • PCI-DSS Level 1
          </span>

          {isAuthed ? (
            <button onClick={handleSignOut} className="rounded-lg px-4 py-2 ring-1 ring-[var(--color-light)] bg-white">Sign Out</button>
          ) : (
            <Link href="/auth/sign-in" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 bg-brand text-white text-center">Join Now</Link>
          )}
        </div>
      )}
    </header>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import logo from "@/public/logo.png"; // high-res, static import

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full bg-[color:var(--color-bg)]">
      {/* Full width row (no centered max-w), small side padding */}
      <div className="w-full px-3 sm:px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          {/* Logo fills row height without changing header height */}
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
          <Link href="/courses" className="text-sm text-muted hover:text-ink">Courses</Link>
          <Link href="/about" className="text-sm text-muted hover:text-ink">About</Link>
          <Link
            href="/leaderboard"
            className="text-sm text-muted hover:text-ink"
          >
            Leaderboard
          </Link>
          <Link
            href="/auth/sign-in"
            className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
          >
            Join Now
          </Link>
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
            <Link href="/courses" onClick={() => setOpen(false)} className="text-ink">Courses</Link>
            <Link href="/about" onClick={() => setOpen(false)} className="text-ink">About</Link>
            <Link href="/leaderboard" onClick={() => setOpen(false)} className="text-ink">Leaderboard</Link>
            <Link
              href="/auth/sign-in"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg px-4 py-2 bg-brand text-white font-medium text-center"
            >
              Join Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

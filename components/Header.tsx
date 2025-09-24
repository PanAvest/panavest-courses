"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-light">
      {/* Fixed row height so the logo fills without increasing header height */}
      <div className="mx-auto max-w-screen-2xl px-6 md:px-8 2xl:px-10 h-16 md:h-20 flex items-center justify-between">
        {/* Logo only, fills row height */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Panavest"
            width={256}
            height={256}
            className="block h-16 md:h-20 w-auto object-contain"
            priority
          />
          <span className="sr-only">Panavest</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/courses" className="text-sm text-muted hover:text-ink">Categories</Link>
          <Link href="/about" className="text-sm text-muted hover:text-ink">About</Link>
          <Link
            href="/auth/sign-up"
            className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
          >
            Sign Up
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden inline-flex items-center justify-center rounded-md p-2 ring-1 ring-black/10 hover:bg-black/[0.04]"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {/* simple hamburger icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="sm:hidden border-t border-light bg-white">
          <div className="px-6 py-3 flex flex-col gap-3">
            <Link href="/courses" className="text-ink" onClick={() => setOpen(false)}>Categories</Link>
            <Link href="/about" className="text-ink" onClick={() => setOpen(false)}>About</Link>
            <Link
              href="/auth/sign-up"
              className="mt-1 rounded-lg px-4 py-2 bg-brand text-white font-medium text-center"
              onClick={() => setOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

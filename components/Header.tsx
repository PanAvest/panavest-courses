"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Use your existing envs (already used elsewhere in your app)
const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      )
    : null;

export default function Header() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(Boolean(data?.session));
    });

    // Live auth changes (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="w-full bg-white border-b border-light">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo only */}
        <Link href="/" className="flex items-center" aria-label="PanAvest Home">
          <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0">
            <Image
              src="/logo.png"
              alt="PanAvest"
              fill
              className="object-contain"
              sizes="80px"
              priority
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/courses" className="text-sm text-muted hover:text-ink">Categories</Link>
          <Link href="/about" className="text-sm text-muted hover:text-ink">About</Link>

          {/* Primary CTA: flips based on auth */}
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="text-sm rounded-lg px-4 py-2 bg-brand text-white font-medium hover:opacity-90"
            >
              Join Now
            </Link>
          )}
        </nav>

        {/* Simple mobile CTA (optional). You can add a hamburger if you want later */}
        <div className="sm:hidden">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="text-sm rounded-lg px-3 py-2 bg-brand text-white font-medium"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="text-sm rounded-lg px-3 py-2 bg-brand text-white font-medium"
            >
              Join
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

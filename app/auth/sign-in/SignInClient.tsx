"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthForm from "@/components/AuthForm";
import Image from "next/image";
import Link from "next/link";
import { BOARDROOM_BLUR } from "@/app/lib/blur";

const BRAND = "#b65437";

export default function SignInClient() {
  const router = useRouter();
  const search = useSearchParams();
  const redirected = useRef(false);

  useEffect(() => {
    let mounted = true;

    const go = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const next = search.get("next") || "/";
      if (data?.session && !redirected.current) {
        redirected.current = true;
        router.replace(next);
      }
    };

    go();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session && !redirected.current) {
        const next = search.get("next") || "/";
        redirected.current = true;
        router.replace(next);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, [router, search]);

  return (
    <div className="min-h-[calc(100dvh-6rem)] grid lg:grid-cols-2">

      {/* ── Left: brand panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-black p-12 xl:p-16">
        {/* Background image */}
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/Boardroom.webp"
            alt=""
            fill
            sizes="50vw"
            placeholder="blur"
            blurDataURL={BOARDROOM_BLUR}
            className="object-cover object-center opacity-35"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent" />
        </div>

        {/* Top: brand name */}
        <div className="relative">
          <Link href="/" className="text-white/80 hover:text-white transition">
            <div className="text-[13px] font-bold tracking-widest uppercase text-white/60">PanAvest</div>
            <div className="text-[11px] font-medium tracking-widest uppercase text-white/30">International &amp; Partners</div>
          </Link>
        </div>

        {/* Middle: headline */}
        <div className="relative">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: BRAND }}>
            Knowledge Development Series
          </p>
          <h2 className="text-[40px] xl:text-[48px] font-extrabold leading-[1.04] text-white">
            Welcome<br />back.
          </h2>
          <p className="mt-4 text-[16px] text-white/60 leading-relaxed max-w-xs">
            Your knowledge programs, assessments, and certificates are waiting.
          </p>
        </div>

        {/* Bottom: quote + trust */}
        <div className="relative space-y-6">
          <figure className="border-l-2 pl-4" style={{ borderColor: BRAND }}>
            <blockquote className="text-[15px] italic text-white/70 leading-relaxed">
              &ldquo;What you plant in your mind grows in your life.&rdquo;
            </blockquote>
            <figcaption className="mt-2 text-[12px] font-semibold text-white/40">
              Prof. Douglas Boateng
            </figcaption>
          </figure>

          <div className="flex flex-wrap gap-2">
            {["ISO 9001", "ISO 21001", "ISO/IEC 27001", "CPD Accredited"].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/50 backdrop-blur-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-col items-center justify-center bg-[color:var(--color-bg)] px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </div>
  );
}

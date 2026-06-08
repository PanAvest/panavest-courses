"use client";

import AuthForm from "@/components/AuthForm";
import Image from "next/image";
import Link from "next/link";
import { BOARDROOM_BLUR } from "@/app/lib/blur";

const BRAND = "#b65437";

export default function SignUpPage() {
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
            Start your<br />
            <span style={{ color: BRAND }}>KDS journey.</span>
          </h2>
          <p className="mt-4 text-[16px] text-white/60 leading-relaxed max-w-xs">
            Join professionals across Africa building verifiable, boardroom-ready expertise.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Certified CPD (CPPD) programs",
              "Verifiable digital certificates",
              "NaCCA-accredited publications",
              "Mobile app — learn anywhere",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[14px] text-white/65">
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: "rgba(182,84,55,0.25)", color: BRAND }}
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: trust badges */}
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            {["ISO 9001 Aligned", "ISO 21001 Informed", "ISO/IEC 27001 Aligned", "CPD Accredited-Ready"].map((badge) => (
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
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </div>
  );
}

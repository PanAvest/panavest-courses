"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { PartnerLogo } from "@/lib/getPartners";

type Props = {
  partners: PartnerLogo[];
  animate?: boolean;
};

export function PartnersMarquee({ partners, animate = false }: Props) {
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (prefersReduced || !animate) return;
    const timer = window.setTimeout(() => setIsAnimating(true), 3000);
    return () => window.clearTimeout(timer);
  }, [prefersReduced, animate]);

  const shouldAnimate = useMemo(
    () => isAnimating && !prefersReduced && animate && partners.length > 1,
    [isAnimating, prefersReduced, animate, partners.length]
  );

  const trackLogos = useMemo(
    () => (shouldAnimate ? [...partners, ...partners] : partners),
    [shouldAnimate, partners]
  );

  if (!partners.length) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center text-[11px] tracking-[0.25em] text-ink/50">PARTNERS</div>

        <div className="mt-6 overflow-hidden partners-marquee partners-marquee-mask">
          <div
            className={`partners-marquee-track ${
              shouldAnimate ? "partners-marquee-track-animate w-max" : "justify-center"
            } flex flex-nowrap items-center gap-10 sm:gap-12 md:gap-14 min-w-full`}
          >
            {trackLogos.map((partner, idx) => (
              <div
                key={`${partner.src}-${idx}`}
                className={`partners-marquee-item ${
                  shouldAnimate && idx >= partners.length ? "partners-marquee-duplicate" : ""
                } flex-shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/5 flex justify-center`}
              >
                <Image
                  src={partner.src}
                  alt={partner.alt}
                  width={320}
                  height={160}
                  loading={idx < 2 ? "eager" : "lazy"}
                  decoding="async"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="h-32 sm:h-36 md:h-40 w-auto object-contain grayscale opacity-60 transition hover:opacity-100 hover:grayscale-0 focus:opacity-100 focus:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PartnersMarquee;

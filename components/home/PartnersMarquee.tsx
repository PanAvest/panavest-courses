"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PartnerLogo } from "@/lib/getPartners";

type Props = {
  partners: PartnerLogo[];
  animate?: boolean;
};

export function PartnersMarquee({ partners, animate = false }: Props) {
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const interactionTimer = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (prefersReduced || !animate) return;
    const timer = window.setTimeout(() => setIsRunning(true), 3000);
    return () => window.clearTimeout(timer);
  }, [prefersReduced, animate]);

  const trackLogos = useMemo(() => [...partners], [partners]);

  const runAnimation = animate && !prefersReduced && isRunning && partners.length > 1 && !userPaused;

  const kickPause = () => {
    setUserPaused(true);
    if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    interactionTimer.current = window.setTimeout(() => setUserPaused(false), 5000);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    dragging.current = true;
    startX.current = e.clientX;
    startScrollLeft.current = railRef.current.scrollLeft;
    railRef.current.setPointerCapture?.(e.pointerId);
    kickPause();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !railRef.current) return;
    const delta = e.clientX - startX.current;
    railRef.current.scrollLeft = startScrollLeft.current - delta;
    e.preventDefault();
  };

  const stopDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e && railRef.current?.hasPointerCapture?.(e.pointerId)) {
      railRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const onScroll = () => kickPause();

  if (!partners.length) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center text-[11px] tracking-[0.25em] text-ink/50">PARTNERS</div>

        <div
          ref={railRef}
          className={`mt-6 partners-rail partners-marquee partners-marquee-mask ${runAnimation ? "is-running" : ""} ${userPaused ? "is-user-paused" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
          onScroll={onScroll}
        >
          <div className="partners-marquee-track flex flex-nowrap whitespace-nowrap items-center min-w-full py-6 min-h-[120px]">
            {[0, 1].map((dup) => (
              <div key={`track-${dup}`} className="flex flex-nowrap whitespace-nowrap items-center">
                {trackLogos.map((partner, idx) => (
                  <div
                    key={`${partner.src}-${dup}-${idx}`}
                    className="partners-marquee-item flex-shrink-0 w-1/2 sm:w-1/3 lg:w-1/5 snap-start flex items-center justify-center px-6 sm:px-7 lg:px-8"
                  >
                    <div className="w-full max-w-[240px] sm:max-w-[220px] md:max-w-[240px] flex items-center justify-center">
                      <Image
                        src={partner.src}
                        alt={partner.alt}
                        width={320}
                        height={160}
                        loading={idx < 2 && dup === 0 ? "eager" : "lazy"}
                        decoding="async"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="h-10 sm:h-12 md:h-14 max-w-full w-auto object-contain grayscale opacity-60 transition hover:opacity-100 hover:grayscale-0 focus:opacity-100 focus:grayscale-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PartnersMarquee;

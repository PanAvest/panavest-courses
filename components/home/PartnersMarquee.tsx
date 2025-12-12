import Image from "next/image";

import type { PartnerLogo } from "@/lib/getPartners";

type Props = {
  partners: PartnerLogo[];
  animate?: boolean;
};

export function PartnersMarquee({ partners, animate = false }: Props) {
  if (!partners.length) return null;

  const shouldAnimate = animate && partners.length > 1;
  const trackLogos = shouldAnimate ? [...partners, ...partners] : partners;

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center text-[11px] tracking-[0.25em] text-ink/50">PARTNERS</div>

        <div className="mt-6 overflow-hidden partners-marquee partners-marquee-mask">
          <div
            className={`partners-marquee-track ${shouldAnimate ? "partners-marquee-track-animate w-max" : "w-full justify-center"} flex items-center gap-10 sm:gap-12 md:gap-14`}
          >
            {trackLogos.map((partner, idx) => (
              <div
                key={`${partner.src}-${idx}`}
                className={`partners-marquee-item ${shouldAnimate && idx >= partners.length ? "partners-marquee-duplicate" : ""} flex-shrink-0`}
              >
                <Image
                  src={partner.src}
                  alt={partner.alt}
                  width={480}
                  height={240}
                  priority={idx < partners.length}
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

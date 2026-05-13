"use client";

import Image from "next/image";

type PartnerLogo = { src: string; alt: string };

type Props = {
  partners: PartnerLogo[];
  animate?: boolean;
};

export function PartnersMarquee({ partners }: Props) {
  if (!partners.length) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center text-[11px] tracking-[0.25em] text-ink/50">PARTNERS</div>

        <div className="partners-marquee mt-6">
          <div className="partners-marquee-track">
            {[0, 1, 2, 3].map((dup) => (
              <div
                key={`row-${dup}`}
                className="partners-marquee-row"
                aria-hidden={dup > 0}
              >
                {partners.map((partner) => (
                  <div
                    key={`${partner.src}-${dup}`}
                    className="partners-logo-tile px-4 sm:px-7 lg:px-8"
                  >
                    <Image
                      src={partner.src}
                      alt={partner.alt}
                      width={320}
                      height={160}
                      priority={dup === 0}
                      decoding="async"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="partners-logo-img h-24 sm:h-26 md:h-30 w-auto object-contain"
                    />
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

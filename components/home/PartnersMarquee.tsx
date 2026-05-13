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

        <div className="partners-marquee mt-5">
          <div className="partners-marquee-track">
            {[0, 1].map((dup) => (
              <div
                key={`row-${dup}`}
                className="partners-marquee-row"
                aria-hidden={dup > 0}
              >
                {partners.map((partner) => (
                  <div
                    key={`${partner.src}-${dup}`}
                    className="partners-logo-tile"
                  >
                    <Image
                      src={partner.src}
                      alt={partner.alt}
                      width={320}
                      height={160}
                      priority={dup === 0}
                      decoding="async"
                      sizes="(max-width: 640px) 120px, (max-width: 1024px) 140px, 150px"
                      className="partners-logo-img"
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

"use client";

import Image from "next/image";

type PartnerLogo = { src: string; alt: string };

type Props = {
  partners: PartnerLogo[];
};

export function PartnersMarquee({ partners }: Props) {
  if (!partners.length) return null;

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center text-[11px] font-semibold tracking-[0.25em] uppercase text-[color:var(--color-ink)]/40">
          Partners
        </div>

        <div className="partners-marquee mt-6">
          <div className="partners-marquee-track">
            {[0, 1].map((dup) => (
              <div
                key={`row-${dup}`}
                className="partners-marquee-row"
                aria-hidden={dup > 0}
              >
                {partners.map((partner) => (
                  <span
                    key={`${partner.src}-${dup}`}
                    className="partners-logo-item"
                  >
                    <Image
                      src={partner.src}
                      alt={partner.alt}
                      width={320}
                      height={160}
                      priority
                      sizes="(max-width: 640px) 144px, (max-width: 1024px) 176px, 184px"
                      className="partners-logo-mark"
                    />
                  </span>
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

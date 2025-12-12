"use client";

import Image from "next/image";

import type { PartnerLogo } from "@/lib/getPartners";

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

        <div className="partners-logos mt-6">
          {[0, 1].map((dup) => (
            <div key={`slide-${dup}`} className="partners-logos-slide">
              {partners.map((partner) => (
                <div key={`${partner.src}-${dup}`} className="partners-logo-item inline-flex items-center justify-center px-6 sm:px-7 lg:px-8">
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    width={320}
                    height={160}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="partners-logo-img h-10 sm:h-12 md:h-14 w-auto object-contain grayscale opacity-60 transition hover:opacity-100 hover:grayscale-0 focus:opacity-100 focus:grayscale-0"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PartnersMarquee;

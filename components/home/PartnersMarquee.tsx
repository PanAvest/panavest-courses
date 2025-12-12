import Image from "next/image";

import type { PartnerLogo } from "@/lib/getPartners";

type Props = {
  partners: PartnerLogo[];
};

export function PartnersMarquee({ partners }: Props) {
  if (!partners.length) return null;

  const doubled = [...partners, ...partners];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white border border-[color:var(--color-light)] shadow-sm px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-ink">Partners</h2>
            <span className="text-xs sm:text-sm text-ink/60">Trusted organisations</span>
          </div>

          <div className="mt-6 overflow-hidden partners-marquee">
            <div className="partners-marquee-track w-max flex items-center gap-16 md:gap-20 lg:gap-24">
              {doubled.map((partner, idx) => (
                <div
                  key={`${partner.src}-${idx}`}
                  className={`partners-marquee-item ${idx >= partners.length ? "partners-marquee-duplicate" : ""} flex-shrink-0`}
                >
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    width={340}
                    height={180}
                    className="h-40 md:h-44 lg:h-48 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PartnersMarquee;

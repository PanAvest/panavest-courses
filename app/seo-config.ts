export const siteName = "PanAvest Knowledge Development Series (KDS) Learning";

export const defaultTitle = "PanAvest KDS – Certified CPPD Knowledge Programs for Africa and Beyond";

export const defaultDescription =
  "PanAvest KDS Learning delivers CPPD-certified knowledge programs based on Professor Douglas Boateng’s globally recognized work in governance, supply chain, leadership, and strategic sourcing.";

export const defaultCanonicalBase = "https://panavestkds.com";

export function buildCanonical(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  return new URL(path, defaultCanonicalBase).toString();
}

// Placeholder OG image path; ensure a real branded asset is placed here.
export const defaultOgImage = "/images/og-default.png";

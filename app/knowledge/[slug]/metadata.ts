import type { Metadata } from "next";
import { buildCanonical, defaultOgImage, siteName } from "../../seo-config";

type Params = { slug: string };

function generateMetadata({ params }: { params: Params }): Metadata {
  const rawSlug = params.slug ?? "";
  const prettyTitle =
    rawSlug
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Knowledge Program";

  const fullTitle = `${prettyTitle} – PanAvest KDS Knowledge Program`;
  const description = `CPPD-certified knowledge program "${prettyTitle}" from PanAvest KDS, inspired by Professor Douglas Boateng’s work. Includes interactive assessments, verifiable certificates, and practical insights for leaders and organisations.`;
  const canonicalPath = `/knowledge/${params.slug}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: buildCanonical(canonicalPath),
    },
    openGraph: {
      title: fullTitle,
      description,
      url: buildCanonical(canonicalPath),
      siteName,
      type: "article",
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [defaultOgImage],
    },
  };
}

export { generateMetadata };

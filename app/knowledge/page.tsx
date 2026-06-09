// Static edge catalog: cached anon Supabase reads (no per-user cookies), safe for ISR/edge.
export const runtime = "edge";
export const revalidate = 600;

import type { Metadata } from "next";
import { buildCanonical, defaultOgImage, siteName } from "../seo-config";

import { getPublicCoursesCatalog } from "@/app/lib/public-data";
import KnowledgeCatalogClient from "./KnowledgeCatalogClient";

export const metadata: Metadata = {
  title: "Knowledge Programs – PanAvest KDS CPPD Learning",
  description:
    "Explore PanAvest KDS CPPD-certified knowledge programs covering governance, leadership, supply chain, strategic sourcing, project management, and more for organisations in Ghana, Africa, and worldwide.",
  alternates: {
    canonical: buildCanonical("/knowledge"),
  },
  openGraph: {
    title: "Knowledge Programs – PanAvest KDS CPPD Learning",
    description:
      "Discover practical, CPPD-certified knowledge programs based on Professor Douglas Boateng’s work, designed for African and global executives.",
    url: buildCanonical("/knowledge"),
    siteName,
    type: "website",
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: "PanAvest KDS Knowledge Programs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Programs – PanAvest KDS CPPD Learning",
    description:
      "PanAvest KDS delivers CPPD-certified knowledge programs for boards, executives, and professionals across Africa and beyond.",
    images: [defaultOgImage],
  },
};

export default async function KnowledgeIndex() {
  const items = await getPublicCoursesCatalog();

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 lg:px-8 2xl:px-20 py-10 2xl:py-16">
      <h1 className="text-3xl font-bold">Knowledge</h1>
      <p className="text-muted mt-1">Browse PanAvest knowledge programs.</p>

      <KnowledgeCatalogClient items={items ?? []} />
    </div>
  );
}

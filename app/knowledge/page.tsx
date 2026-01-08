// Static edge catalog: cached anon Supabase reads (no per-user cookies), safe for ISR/edge.
export const runtime = "edge";
export const revalidate = 600;

import type { Metadata } from "next";
import { buildCanonical, defaultOgImage, siteName } from "../seo-config";
import Link from "next/link";
import Image from "next/image";

import { getPublicCoursesCatalog } from "@/app/lib/public-data";

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
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-10">
      <h1 className="text-3xl font-bold">Knowledge</h1>
      <p className="text-muted mt-1">Browse PanAvest knowledge programs.</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(items ?? []).map((c, idx) => (
          <Link
            key={c.id}
            href={`/knowledge/${c.slug}`}
            className="group rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden animate-fade-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="bg-white">
              <Image
                src={c.img || "/project-management.png"}
                alt={c.title ?? "Course cover"}
                width={1200}
                height={900}
                className="w-full h-auto"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="px-5 py-4">
              <h3 className="font-semibold text-lg">{c.title}</h3>
              <div className="mt-1 text-sm text-muted line-clamp-2">{c.description}</div>
              <div className="mt-3 text-sm">
                <span className="font-semibold">GH₵{Number(c.price ?? 0).toFixed(2)}</span>
                <span className="ml-2 text-muted">· {c.cpd_points ?? 0} CPPD</span>
              </div>
            </div>
          </Link>
        ))}
        {(items ?? []).length === 0 && <div className="text-muted">No items.</div>}
      </div>
    </div>
  );
}

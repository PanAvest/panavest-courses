"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Database } from "@/lib/types";

type Course = Database["public"]["Tables"]["courses"]["Row"];

type KnowledgeCatalogClientProps = {
  items: Course[];
};

export default function KnowledgeCatalogClient({ items }: KnowledgeCatalogClientProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((course) => {
      const haystack = [
        course.title ?? "",
        course.description ?? "",
        course.slug ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const visibleItems = normalizedQuery ? filteredItems : items;
  const resultCountLabel = normalizedQuery
    ? `Showing ${visibleItems.length} of ${items.length}`
    : `${items.length} programs`;

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <label htmlFor="knowledge-search" className="sr-only">
            Search knowledge programs
          </label>
          <div className="relative">
            <input
              id="knowledge-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search programs, topics, or keywords"
              className="w-full rounded-lg bg-white px-4 py-2.5 pr-16 text-sm ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-red)]"
              autoComplete="off"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="text-sm text-muted">{resultCountLabel}</div>
      </div>

      <div className="mt-6 grid gap-6 2xl:gap-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visibleItems.map((course, idx) => (
          <Link
            key={course.id}
            href={`/knowledge/${course.slug}`}
            className="group rounded-xl bg-white shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden animate-fade-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="bg-white">
              <Image
                src={course.img || "/project-management.png"}
                alt={course.title ?? "Course cover"}
                width={1200}
                height={900}
                className="w-full h-auto"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="px-5 py-4">
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <div className="mt-1 text-sm text-muted line-clamp-2">{course.description}</div>
              <div className="mt-3 text-sm">
                <span className="font-semibold">
                  {course.free_for_logged_in
                    ? "Free with login"
                    : `GH₵${Number(course.price ?? 0).toFixed(2)}`}
                </span>
                <span className="ml-2 text-muted">· {course.cpd_points ?? 0} CPPD</span>
              </div>
            </div>
          </Link>
        ))}
        {visibleItems.length === 0 && (
          <div className="text-muted">
            {normalizedQuery ? `No results for "${query}".` : "No items."}
          </div>
        )}
      </div>
    </>
  );
}

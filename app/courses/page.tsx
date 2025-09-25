"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";

/** Data shape from public.courses (backend stays "courses"; UI says "knowledge") */
type Knowledge = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  price: number | null;
  cpd_points: number | null;
  img: string | null;
  accredited: string[] | null;
  published: boolean | null;
};

type SortKey = "title" | "price" | "cpd_points";
type SortDir = "asc" | "desc";

const supabase: SupabaseClient | null =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      )
    : null;

export default function KnowledgeIndexPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Knowledge[]>([]);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, description, level, price, cpd_points, img, accredited, published")
        .eq("published", true)
        .order("title", { ascending: true });
      if (!mounted) return;
      setRows(error || !data ? [] : (data as Knowledge[]));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const levels = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.level && s.add(r.level));
    return ["all", ...Array.from(s)];
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      const hitQ = !ql || r.title.toLowerCase().includes(ql) || (r.description ?? "").toLowerCase().includes(ql);
      const hitLevel = level === "all" || (r.level ?? "").toLowerCase() === level.toLowerCase();
      return hitQ && hitLevel;
    });

    list = list.slice().sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "title") return a.title.localeCompare(b.title) * dir;
      if (sortKey === "price") {
        const av = a.price ?? Number.POSITIVE_INFINITY; const bv = b.price ?? Number.POSITIVE_INFINITY;
        return (av - bv) * dir;
      }
      const av = a.cpd_points ?? -1; const bv = b.cpd_points ?? -1; // CPPD points
      return (av - bv) * dir;
    });

    return list;
  }, [rows, q, level, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Heading + controls */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Browse Knowledge</h1>
          <p className="mt-2 text-muted">Certified CPD (CPPD) knowledge development programmes from PanAvest.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search knowledge…"
            className="h-10 w-56 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] focus:outline-none"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
          >
            {levels.map((lv) => (
              <option key={lv} value={lv}>{lv === "all" ? "All levels" : lv}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-10 rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)]"
            >
              <option value="title">Sort: Title</option>
              <option value="price">Sort: Price</option>
              <option value="cpd_points">Sort: CPPD points</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-10 rounded-lg px-3 ring-1 ring-[color:var(--color-light)] bg-white"
              aria-label="Toggle sort direction"
              title="Toggle sort direction"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        {loading ? (
          <div className="text-muted">Loading knowledge…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-light bg-white p-6 text-muted">No knowledge matches your filters.</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((k) => {
              const priceText = Number.isFinite(k.price ?? NaN)
                ? `GH₵ ${Number(k.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";
              const pts = Number.isFinite(k.cpd_points ?? NaN) ? `${k.cpd_points} CPPD pts` : "";
              const hasCPD = (k.accredited ?? []).some((x) => /cpd|cppd/i.test(String(x)));
              const hasNaCCA = (k.accredited ?? []).some((x) => /nacca/i.test(String(x)));

              return (
                <Link key={k.id} href={`/courses/${k.slug}`} className="group rounded-2xl bg-white border border-light hover:shadow-sm transition overflow-hidden">
                  <div className="border-b border-light bg-white">
                    <Image
                      src={k.img || "/hero-illustration.png"}
                      alt={k.title}
                      width={1200}
                      height={900}
                      className="w-full h-auto"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>

                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-lg text-ink group-hover:text-brand line-clamp-2">{k.title}</h3>
                      <div className="text-sm text-muted whitespace-nowrap">{priceText}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {k.level && <span className="rounded-full px-2 py-0.5 ring-1 ring-[color:var(--color-light)]">{k.level}</span>}
                      {pts && <span className="rounded-full px-2 py-0.5 ring-1 ring-[color:var(--color-light)]">{pts}</span>}
                      {hasCPD && <span className="rounded-full px-2 py-0.5 bg-brand text-white">CPPD</span>}
                      {hasNaCCA && <span className="rounded-full px-2 py-0.5 ring-1 ring-[color:var(--color-light)]">NaCCA</span>}
                    </div>

                    {k.description && <p className="mt-2 text-sm text-muted line-clamp-2">{k.description}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

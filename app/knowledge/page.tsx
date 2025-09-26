import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function KnowledgeIndex() {
  const { data: items } = await supabase
    .from("courses")
    .select("id,slug,title,description,img,price,cpd_points,published")
    .eq("published", true)
    .order("title", { ascending: true });

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-10">
      <h1 className="text-3xl font-bold">Knowledge</h1>
      <p className="text-muted mt-1">Browse PanAvest knowledge programs.</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(items ?? []).map((c) => (
          <Link key={c.id} href={`/knowledge/${c.slug}`} className="group rounded-2xl bg-white border border-light overflow-hidden hover:shadow-sm">
            <div className="border-b border-light bg-white">
              <Image src={c.img || "/project-management.png"} alt={c.title} width={1200} height={900} className="w-full h-auto" />
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

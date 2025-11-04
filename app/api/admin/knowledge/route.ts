import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** lowercase, replace non-alnum with '-', trim dashes */
function normaliseSlug(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LIST_FIELDS =
  "id,slug,title,description,level,price,cpd_points,img,accredited,published,created_at";

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("courses")
    .select(LIST_FIELDS)
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payload = {
      id: (body?.id as string | undefined) || undefined,
      slug: normaliseSlug((body?.slug as string) || ""),
      title: String((body?.title as string) || ""),
      description: (body?.description as string | null) ?? null,
      level: (body?.level as string | null) ?? null,
      price:
        typeof body?.price === "number"
          ? (body.price as number)
          : body?.price == null
          ? null
          : Number(body.price),
      cpd_points:
        typeof body?.cpd_points === "number"
          ? (body.cpd_points as number)
          : body?.cpd_points == null
          ? null
          : Number(body.cpd_points),
      img: (body?.img as string | null) ?? null,
      accredited: Array.isArray(body?.accredited)
        ? (body.accredited as unknown[]).map(String)
        : null,
      published:
        typeof body?.published === "boolean" ? (body.published as boolean) : true,
    };

    if (!payload.slug || !payload.title) {
      return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (payload.id) {
      // UPDATE (safe when slug changes)
      const { data, error } = await admin
        .from("courses")
        .update({
          slug: payload.slug,
          title: payload.title,
          description: payload.description,
          level: payload.level,
          price: payload.price,
          cpd_points: payload.cpd_points,
          img: payload.img,
          accredited: payload.accredited,
          published: payload.published,
        })
        .eq("id", payload.id)
        .select(LIST_FIELDS)
        .single();

      if (error) {
        const msg = (error as any)?.message?.toLowerCase?.() ?? "";
        if (msg.includes("duplicate key value") || msg.includes("unique constraint")) {
          return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
        }
        return NextResponse.json({ error: (error as any)?.message ?? "Update failed" }, { status: 500 });
      }
      return NextResponse.json(data ?? null);
    }

    // CREATE (upsert by slug to keep behavior)
    const { data, error } = await admin
      .from("courses")
      .upsert(
        [
          {
            slug: payload.slug,
            title: payload.title,
            description: payload.description,
            level: payload.level,
            price: payload.price,
            cpd_points: payload.cpd_points,
            img: payload.img,
            accredited: payload.accredited,
            published: payload.published,
          },
        ],
        { onConflict: "slug" }
      )
      .select(LIST_FIELDS)
      .single();

    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() ?? "";
      if (msg.includes("duplicate key value") || msg.includes("unique constraint")) {
        return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: (error as any)?.message ?? "Create failed" }, { status: 500 });
    }

    return NextResponse.json(data ?? null);
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

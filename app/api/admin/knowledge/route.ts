import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { PostgrestError } from "@supabase/supabase-js";

/** lowercase, replace non-alnum with '-', trim dashes */
function normaliseSlug(raw: string) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUniqueViolation(err: PostgrestError | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true; // Postgres unique_violation
  const msg = (err.message || "").toLowerCase();
  return msg.includes("duplicate key value") || msg.includes("unique constraint");
}

const LIST_FIELDS =
  "id,slug,title,description,level,price,cpd_points,img,accredited,published,coming_soon,delivery_mode,interactive_path,free_for_logged_in,created_at";
const LEGACY_LIST_FIELDS =
  "id,slug,title,description,level,price,cpd_points,img,accredited,published,coming_soon,delivery_mode,interactive_path,created_at";

function isMissingFreeColumnError(err: PostgrestError | null | undefined): boolean {
  if (!err) return false;
  const text = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  if (!text.includes("free_for_logged_in")) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("could not find");
}

export async function GET() {
  const admin = getSupabaseAdmin();
  let { data, error } = await admin
    .from("courses")
    .select(LIST_FIELDS)
    .order("title", { ascending: true });
  if (error && isMissingFreeColumnError(error)) {
    const fallback = await admin
      .from("courses")
      .select(LEGACY_LIST_FIELDS)
      .order("title", { ascending: true });
    data = fallback.data as unknown as typeof data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown as {
      id?: string;
      slug?: string;
      title?: string;
      description?: string | null;
      level?: string | null;
      price?: number | string | null;
      cpd_points?: number | string | null;
      img?: string | null;
      accredited?: unknown;
      published?: boolean;
      coming_soon?: boolean;
      delivery_mode?: string | null;
      interactive_path?: string | null;
      free_for_logged_in?: boolean;
    };

    const payload = {
      id: body?.id || undefined,
      slug: normaliseSlug(body?.slug || ""),
      title: String(body?.title || ""),
      description: (body?.description ?? null) as string | null,
      level: (body?.level ?? null) as string | null,
      price:
        body?.price == null
          ? null
          : typeof body.price === "number"
          ? body.price
          : Number(body.price),
      cpd_points:
        body?.cpd_points == null
          ? null
          : typeof body.cpd_points === "number"
          ? body.cpd_points
          : Number(body.cpd_points),
      img: (body?.img ?? null) as string | null,
      accredited: Array.isArray(body?.accredited)
        ? (body.accredited as unknown[]).map(String)
        : null,
      published: typeof body?.published === "boolean" ? body.published : true,
      coming_soon: typeof body?.coming_soon === "boolean" ? body.coming_soon : false,
      delivery_mode: body?.delivery_mode === "interactive" ? "interactive" : "slides",
      interactive_path: (body?.interactive_path ?? null) as string | null,
      free_for_logged_in:
        typeof body?.free_for_logged_in === "boolean" ? body.free_for_logged_in : false,
    };

    if (!payload.slug || !payload.title) {
      return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
    }
    if (payload.delivery_mode === "interactive" && !payload.interactive_path) {
      return NextResponse.json({ error: "interactive_path is required for interactive courses" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    if (payload.id) {
      // UPDATE by id (safe for slug changes)
      let { data, error: updErr } = await admin
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
          coming_soon: payload.coming_soon,
          delivery_mode: payload.delivery_mode,
          interactive_path: payload.interactive_path,
          free_for_logged_in: payload.free_for_logged_in,
        })
        .eq("id", payload.id)
        .select(LIST_FIELDS)
        .single();
      if (updErr && isMissingFreeColumnError(updErr)) {
        const fallback = await admin
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
            coming_soon: payload.coming_soon,
            delivery_mode: payload.delivery_mode,
            interactive_path: payload.interactive_path,
          })
          .eq("id", payload.id)
          .select(LEGACY_LIST_FIELDS)
          .single();
        data = fallback.data as unknown as typeof data;
        updErr = fallback.error;
      }

      if (updErr) {
        if (isUniqueViolation(updErr)) {
          return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
        }
        return NextResponse.json({ error: updErr.message || "Update failed" }, { status: 500 });
      }
      return NextResponse.json(data ?? null);
    }

    // CREATE via upsert on slug
    let { data, error: insErr } = await admin
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
          coming_soon: payload.coming_soon,
          delivery_mode: payload.delivery_mode,
          interactive_path: payload.interactive_path,
          free_for_logged_in: payload.free_for_logged_in,
        },
      ],
      { onConflict: "slug" }
    )
      .select(LIST_FIELDS)
      .single();
    if (insErr && isMissingFreeColumnError(insErr)) {
      const fallback = await admin
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
              coming_soon: payload.coming_soon,
              delivery_mode: payload.delivery_mode,
              interactive_path: payload.interactive_path,
            },
          ],
          { onConflict: "slug" }
        )
        .select(LEGACY_LIST_FIELDS)
        .single();
      data = fallback.data as unknown as typeof data;
      insErr = fallback.error;
    }

    if (insErr) {
      if (isUniqueViolation(insErr)) {
        return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: insErr.message || "Create failed" }, { status: 500 });
    }

    return NextResponse.json(data ?? null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

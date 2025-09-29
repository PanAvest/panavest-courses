import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type SlideBody = {
  id?: string;
  chapter_id?: string;
  title?: string;
  order_index?: number | string;
  intro_video_url?: string | null;
  video_url?: string | null;       // legacy alias
  asset_url?: string | null;
  body?: string | null;            // preferred
  content?: string | null;         // legacy alias
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}
function serverError(msg: string) {
  return NextResponse.json({ error: msg }, { status: 500 });
}

/** List slides by chapter, sorted */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapter_id = url.searchParams.get("chapter_id");
  if (!chapter_id) return badRequest("chapter_id required");

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("course_slides")
    .select("*")
    .eq("chapter_id", chapter_id)
    .order("order_index", { ascending: true });

  if (error) return serverError(error.message);
  return NextResponse.json(data ?? []);
}

/** Create/update slide (upsert by id). Appends order_index if missing */
export async function POST(req: Request) {
  const payload = (await req.json()) as SlideBody;

  if (!payload.chapter_id || !payload.title) {
    return badRequest("chapter_id and title are required");
  }

  const db = getSupabaseAdmin();

  // Compute order_index if not provided
  let order_index: number;
  if (payload.order_index === undefined || payload.order_index === null || payload.order_index === "") {
    const { data: maxRow, error: maxErr } = await db
      .from("course_slides")
      .select("order_index")
      .eq("chapter_id", payload.chapter_id)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) return serverError(maxErr.message);
    order_index = (typeof maxRow?.order_index === "number" ? maxRow.order_index : -1) + 1;
  } else {
    order_index = Number(payload.order_index);
    if (!Number.isFinite(order_index)) return badRequest("order_index must be a number");
  }

  const row = {
    id: payload.id || undefined,
    chapter_id: payload.chapter_id,
    title: payload.title,
    order_index,
    intro_video_url: payload.intro_video_url ?? payload.video_url ?? null,
    asset_url: payload.asset_url ?? null,
    body: payload.body ?? payload.content ?? null,
  };

  const { data, error } = await db
    .from("course_slides")
    .upsert([row], { onConflict: "id" })
    .select()
    .maybeSingle();

  if (error) return serverError(error.message);
  return NextResponse.json(data);
}

/** Delete slide by id (?id=...) */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return badRequest("id required");

  const db = getSupabaseAdmin();
  const { error } = await db.from("course_slides").delete().eq("id", id);
  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}

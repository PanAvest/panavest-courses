import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function bad(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const chapter_id = url.searchParams.get("chapter_id") || "";
    if (!chapter_id) return NextResponse.json([]);
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("course_slides")
      .select("id, chapter_id, title, order_index, intro_video_url, asset_url, body")
      .eq("chapter_id", chapter_id)
      .order("order_index", { ascending: true });
    if (error) return bad(500, error.message);
    return NextResponse.json(data ?? []);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return bad(500, msg);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" && body.id ? body.id : undefined;
    const chapter_id = typeof body.chapter_id === "string" ? body.chapter_id : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const oi = Number(body.order_index);
    const order_index = Number.isFinite(oi) ? oi : 0;
    const intro_video_url = typeof body.intro_video_url === "string" && body.intro_video_url ? body.intro_video_url : null;
    const asset_url = typeof body.asset_url === "string" && body.asset_url ? body.asset_url : null;
    const text_body = typeof body.body === "string" && body.body ? body.body : null;

    if (!id && !chapter_id) return bad(400, "chapter_id required for insert");
    if (!title) return bad(400, "title required");

    const db = getSupabaseAdmin();

    if (id) {
      const patch: Record<string, unknown> = {
        title, order_index, intro_video_url, asset_url, body: text_body,
      };
      const { data, error } = await db
        .from("course_slides")
        .update(patch)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) return bad(500, error.message);
      return NextResponse.json(data);
    } else {
      const { data, error } = await db
        .from("course_slides")
        .insert([{
          chapter_id, title, order_index, intro_video_url, asset_url, body: text_body,
        }])
        .select()
        .maybeSingle();
      if (error) return bad(500, error.message);
      return NextResponse.json(data);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return bad(500, msg);
  }
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function bad(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const course_id = url.searchParams.get("course_id") || "";
    if (!course_id) return NextResponse.json([]);
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("course_chapters")
      .select("id, course_id, title, order_index")
      .eq("course_id", course_id)
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
    const course_id = typeof body.course_id === "string" ? body.course_id : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const oi = Number(body.order_index);
    const order_index = Number.isFinite(oi) ? oi : 0;

    if (!id && !course_id) return bad(400, "course_id required for insert");
    if (!title) return bad(400, "title required");

    const db = getSupabaseAdmin();

    if (id) {
      const { data, error } = await db
        .from("course_chapters")
        .update({ title, order_index })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) return bad(500, error.message);
      return NextResponse.json(data);
    } else {
      const { data, error } = await db
        .from("course_chapters")
        .insert([{ course_id, title, order_index }])
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

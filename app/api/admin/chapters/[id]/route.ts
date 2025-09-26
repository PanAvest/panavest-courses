import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(req: Request) {
  const id = req.url.split("/").pop() || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { error } = await db.from("course_chapters").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(req: Request) {
  const id = new URL(req.url).pathname.split("/").pop() || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(_req: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Next 15: context.params can be a Promise */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

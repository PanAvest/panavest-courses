import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Next.js 15: context.params may be a Promise, so await it.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

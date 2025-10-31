// app/api/admin/users/[id]/[action]/route.ts
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["ban", "unban", "revoke", "clear-history", "delete"] as const);
type AllowedAction = typeof ALLOWED extends Set<infer T> ? T : never;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id?: string; action?: string } }
) {
  const id = params?.id ?? "";
  const action = params?.action ?? "";

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }
  if (!ALLOWED.has(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // STUB: Return success without doing anything server-side.
  // Replace later with real Supabase admin calls.
  return NextResponse.json({ ok: true, stub: true });
}

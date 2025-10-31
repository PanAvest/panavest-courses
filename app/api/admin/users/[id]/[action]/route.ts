// app/api/admin/users/[id]/[action]/route.ts

// Use the standard Web Request/Response for Route Handlers
import { NextResponse } from "next/server";

// Allowed actions as a literal union
const ALLOWED = ["ban", "unban", "revoke", "clear-history", "delete"] as const;
type AllowedAction = (typeof ALLOWED)[number];
const ALLOWED_SET = new Set<AllowedAction>(ALLOWED);

// ✅ Don’t over-constrain the second arg. Let Next infer it.
//    If you want, you can keep a *narrow* inline type, but this version avoids the checker mismatch.
export async function POST(
  _req: Request,
  context: any // <- safest for Next’s internal typing; we immediately validate below
) {
  const { id, action } = (context?.params ?? {}) as { id?: string; action?: string };

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }
  if (!ALLOWED_SET.has(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // STUB: keep current behavior (no server-side changes yet)
  return NextResponse.json({ ok: true, stub: true, id, action });
}

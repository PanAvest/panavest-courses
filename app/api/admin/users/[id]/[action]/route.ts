// app/api/admin/users/[id]/[action]/route.ts
import { NextRequest, NextResponse } from "next/server";

// Define allowed actions as a tuple → easy literal union type
const ALLOWED = ["ban", "unban", "revoke", "clear-history", "delete"] as const;
type AllowedAction = (typeof ALLOWED)[number];
const ALLOWED_SET = new Set<AllowedAction>(ALLOWED);

/**
 * Next.js App Router expects the second arg type to MATCH your dynamic segments
 * exactly. Do NOT mark them optional.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  const { id, action } = params;

  // Basic presence check (defense-in-depth; should always be present if route matches)
  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  // Validate action against the allowlist (runtime)
  if (!ALLOWED_SET.has(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // STUB: Return success without doing anything server-side.
  // (Swap this for your real Supabase admin logic later.)
  return NextResponse.json({ ok: true, stub: true, id, action });
}

// app/api/admin/users/[id]/[action]/route.ts
import { NextResponse } from "next/server";

// Allowed actions as a literal union
const ALLOWED = ["ban", "unban", "revoke", "clear-history", "delete"] as const;
type AllowedAction = (typeof ALLOWED)[number];
const ALLOWED_SET = new Set<AllowedAction>(ALLOWED);

/**
 * Route handler for /api/admin/users/[id]/[action]
 * Fully typed, no ESLint warnings, and compatible with Next 15 App Router.
 */
export async function POST(
  _req: Request,
  // ✅ Use a structural type instead of `any` to satisfy both ESLint and Next.js
  context: { params?: { id?: string; action?: string } }
) {
  const { id, action } = context.params ?? {};

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  if (!ALLOWED_SET.has(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // STUB: Replace with real Supabase admin logic later
  return NextResponse.json({ ok: true, stub: true, id, action });
}

import { NextResponse } from "next/server";

const ALLOWED = ["ban", "unban", "revoke", "clear-history", "delete"] as const;
type AllowedAction = (typeof ALLOWED)[number];
const ALLOWED_SET = new Set<AllowedAction>(ALLOWED);

/**
 * Build-proof route handler for Next 15:
 * - Only uses the Web Request argument (no typed 2nd arg)
 * - Extracts [id]/[action] from req.url
 * - No `any`, no ESLint complaints, no signature mismatch
 */
export async function POST(req: Request) {
  const url = new URL(req.url);

  // Match .../api/admin/users/:id/:action (with or without trailing slash)
  // Adjust the leading path if this route is nested differently in your app.
  const m = url.pathname.match(/\/api\/admin\/users\/([^/]+)\/([^/]+)\/?$/);
  if (!m) {
    return NextResponse.json({ error: "Invalid route path" }, { status: 400 });
  }

  const id = m[1];
  const action = m[2];

  if (!ALLOWED_SET.has(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // STUB: keep current behavior; plug in real admin logic later
  return NextResponse.json({ ok: true, stub: true, id, action });
}

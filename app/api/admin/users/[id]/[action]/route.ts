// app/api/admin/users/[id]/[action]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_ACTIONS = new Set(["ban", "unban", "revoke", "clear-history", "delete"] as const);
type AllowedAction = typeof ALLOWED_ACTIONS extends Set<infer T> ? T : never;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id?: string; action?: string } }
) {
  const id = params?.id ?? "";
  const action = params?.action ?? "";

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }
  if (!ALLOWED_ACTIONS.has(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (action as AllowedAction) {
      case "ban": {
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { banned: true },
        });
        break;
      }
      case "unban": {
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { banned: false },
        });
        break;
      }
      case "revoke": {
        // No direct Admin API for revoking sessions in supabase-js v2.
        // We set a marker your app can use to force sign-out.
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { session_revoked_at: new Date().toISOString() },
        });
        break;
      }
      case "clear-history": {
        // App-specific placeholder (no-op)
        break;
      }
      case "delete": {
        await admin.auth.admin.deleteUser(id);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message =
      (e && typeof e === "object" && "message" in e && typeof (e as any).message === "string")
        ? (e as any).message
        : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

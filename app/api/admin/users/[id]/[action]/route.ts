import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type UserAction = "ban" | "unban" | "revoke" | "clear-history" | "delete";

export async function POST(
  _req: NextRequest,
  ctx: { params: { id?: string; action?: string } }
) {
  const id = ctx.params?.id ?? "";
  const action = ctx.params?.action as UserAction | undefined;

  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (action) {
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
        // App can watch this marker to force client sign-out.
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { session_revoked_at: new Date().toISOString() },
        });
        break;
      }
      case "clear-history": {
        // App-specific no-op placeholder (intentionally left blank).
        break;
      }
      case "delete": {
        await admin.auth.admin.deleteUser(id);
        break;
      }
      default: {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: unknown }).message ?? "Action failed")
        : "Action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

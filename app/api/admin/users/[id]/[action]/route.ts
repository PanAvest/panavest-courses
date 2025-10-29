import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type UserAction = "ban" | "unban" | "revoke" | "clear-history" | "delete";

export async function POST(
  _req: NextRequest,
  ctx: { params: { id: string; action: UserAction } }
) {
  const { id, action } = ctx.params;
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
        // Optional: set a marker your app can use to force sign-out.
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { session_revoked_at: new Date().toISOString() },
        });
        break;
      }
      case "clear-history": {
        // App-specific no-op placeholder
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
    const err = e as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Action failed" },
      { status: 500 }
    );
  }
}

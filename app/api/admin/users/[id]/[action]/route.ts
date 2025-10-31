/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED = new Set(["ban", "unban", "revoke", "clear-history", "delete"] as const);

export async function POST(
  _req: NextRequest,
  { params }: { params: Record<string, string> } // ✅ Next 15-compatible
) {
  const id = params.id ?? "";
  const action = params.action ?? "";

  if (!id || !ALLOWED.has(action as any)) {
    return NextResponse.json({ error: "Invalid action or missing id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    switch (action) {
      case "ban": {
        await admin.auth.admin.updateUserById(id, { user_metadata: { banned: true } });
        break;
      }
      case "unban": {
        await admin.auth.admin.updateUserById(id, { user_metadata: { banned: false } });
        break;
      }
      case "revoke": {
        // No direct Admin API to revoke sessions in supabase-js v2.
        // Mark user; your app can force sign-out on next API call.
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { session_revoked_at: new Date().toISOString() },
        });
        break;
      }
      case "clear-history": {
        // App-specific placeholder; implement if you track history.
        break;
      }
      case "delete": {
        await admin.auth.admin.deleteUser(id);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? "Action failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
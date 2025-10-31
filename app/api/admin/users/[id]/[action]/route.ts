// app/api/admin/users/[id]/[action]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Ensure this route never caches
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Allowed admin actions
const ALLOWED = ["ban", "unban", "revoke", "clear-history", "delete"] as const;
type UserAction = (typeof ALLOWED)[number];

function bad(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id?: string; action?: string } }
) {
  const id = params?.id?.trim();
  const actionRaw = params?.action ?? "";
  const action = ALLOWED.find((a) => a === actionRaw) as UserAction | undefined;

  if (!id) return bad(400, "Missing user id");
  if (!action) return bad(400, "Invalid action");

  const admin = getSupabaseAdmin();

  try {
    switch (action) {
      case "ban": {
        const { error } = await admin.auth.admin.updateUserById(id, {
          user_metadata: { banned: true },
        });
        if (error) throw error;
        break;
      }

      case "unban": {
        const { error } = await admin.auth.admin.updateUserById(id, {
          user_metadata: { banned: false },
        });
        if (error) throw error;
        break;
      }

      case "revoke": {
        // No direct session revoke in supabase-js v2 Admin API.
        // Mark metadata so your app can force a re-login client-side.
        const { error } = await admin.auth.admin.updateUserById(id, {
          user_metadata: { session_revoked_at: new Date().toISOString() },
        });
        if (error) throw error;
        break;
      }

      case "clear-history": {
        // App-specific no-op; implement if you add an audit/history store.
        break;
      }

      case "delete": {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message)
        : "Action failed";
    return bad(500, message);
  }
}

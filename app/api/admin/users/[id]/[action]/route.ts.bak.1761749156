import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Action = "ban" | "unban" | "revoke" | "clear-history" | "delete";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; action: Action } }
) {
  const { id, action } = params;
  const admin = getSupabaseAdmin();

  try {
    switch (action) {
      case "ban": {
        const { error } = await admin.auth.admin.updateUserById(id, { app_metadata: { banned: true } });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "unban": {
        const { error } = await admin.auth.admin.updateUserById(id, { app_metadata: { banned: false } });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "revoke": {
        // Revoke all sessions for this user (supported on recent SDKs)
        // @ts-ignore
        const { error } = await admin.auth.admin.signOut(id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      case "clear-history": {
        // TODO: Implement according to your data model (e.g., delete rows from attempts/messages)
        return NextResponse.json({ ok: true, cleared: 0 });
      }
      case "delete": {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

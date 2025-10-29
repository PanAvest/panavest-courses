import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? undefined,
    email_confirmed_at: (u as any)?.email_confirmed_at ?? null,
    created_at: u.created_at ?? null,
    banned: Boolean((u.app_metadata as any)?.banned === true),
  }));

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const { action, email } = (await req.json()) as { action: string; email?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  if (action === "generate_confirmation_link") {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data?.properties?.action_link ?? null });
  }

  if (action === "generate_reset_link") {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data?.properties?.action_link ?? null });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data?.users ?? []).map((u) => {
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const banned = typeof meta.banned === "boolean" ? (meta.banned as boolean) : null;

    return {
      id: u.id,
      email: u.email ?? undefined,
      email_confirmed_at: u.email_confirmed_at ?? null,
      created_at: u.created_at ?? null,
      banned,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;

  // Narrow & validate safely
  if (
    !body ||
    typeof body !== "object" ||
    !("action" in body) ||
    typeof (body as Record<string, unknown>).action !== "string"
  ) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { action, email } = body as { action: string; email?: string };
  const admin = getSupabaseAdmin();

  if (action === "generate_confirmation_link") {
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data?.properties?.action_link ?? null });
  }

  if (action === "generate_reset_link") {
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data?.properties?.action_link ?? null });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

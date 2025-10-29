// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ListUsersResponse = {
  users: Array<{
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    created_at?: string | null;
    banned?: boolean | null;
  }>;
};

export async function GET() {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users =
    (data?.users ?? []).map((u) => ({
      id: String(u.id),
      email: u.email ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      created_at: u.created_at ?? null,
      // read flag from user_metadata.banned (boolean) if present
      banned:
        typeof (u.user_metadata as Record<string, unknown> | null)?.banned === "boolean"
          ? Boolean((u.user_metadata as Record<string, unknown>).banned)
          : null,
    })) ?? [];

  const payload: ListUsersResponse = { users };
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  const body = (await req.json()) as { action: "generate_confirmation_link" | "generate_reset_link"; email?: string };

  if (!body?.email) return NextResponse.json({ error: "email required" }, { status: 400 });

  if (body.action === "generate_confirmation_link") {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: body.email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data?.properties?.action_link ?? null });
  }

  if (body.action === "generate_reset_link") {
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: body.email });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data?.properties?.action_link ?? null });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

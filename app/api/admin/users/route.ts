import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const admin = getSupabaseAdmin();

  try {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const users = (data?.users ?? []).map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const banned =
        typeof meta.banned === "boolean" ? (meta.banned as boolean) : null;

      return {
        id: u.id,
        email: u.email ?? undefined,
        email_confirmed_at: u.email_confirmed_at ?? null,
        created_at: u.created_at ?? null,
        banned,
      };
    });

    return NextResponse.json({ users });
  } catch (e) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: unknown }).message ?? "Failed to list users")
        : "Failed to list users";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

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

  try {
    if (action === "generate_confirmation_link") {
      if (!email) {
        return NextResponse.json({ error: "email required" }, { status: 400 });
      }
      // Magic link (confirm sign-in)
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        link: data?.properties?.action_link ?? null,
      });
    }

    if (action === "generate_reset_link") {
      if (!email) {
        return NextResponse.json({ error: "email required" }, { status: 400 });
      }
      // Password recovery link
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        link: data?.properties?.action_link ?? null,
      });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (e) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String(
            (e as { message?: unknown }).message ?? "Failed to process request"
          )
        : "Failed to process request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

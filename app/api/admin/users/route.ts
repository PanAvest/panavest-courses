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

    const baseUsers = data?.users ?? [];
    const userIds = baseUsers.map((u) => u.id);

    // Pull profile metadata (full name, age, edu, country)
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, age, highest_education, country_code, country_name")
      .in("id", userIds);
    const profileById = new Map<string, Record<string, unknown>>();
    (profiles ?? []).forEach((p) => profileById.set(String((p as { id: string }).id), p as Record<string, unknown>));

    // Pull certificates with course titles
    const { data: certs } = await admin
      .from("certificates")
      .select("id, certificate_no, user_id, course_id, courses ( title )")
      .in("user_id", userIds);
    const certsByUser = new Map<string, Array<Record<string, unknown>>>();
    (certs ?? []).forEach((c) => {
      const uid = String((c as { user_id: string | null }).user_id ?? "");
      if (!uid) return;
      const arr = certsByUser.get(uid) ?? [];
      arr.push(c as Record<string, unknown>);
      certsByUser.set(uid, arr);
    });

    const users = baseUsers.map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const banned = typeof meta.banned === "boolean" ? (meta.banned as boolean) : null;
      const p = profileById.get(u.id);
      const userCerts =
        certsByUser.get(u.id)?.map((c) => {
          const coursesField = c["courses"];
          const title =
            Array.isArray(coursesField) && coursesField.length > 0
              ? ((coursesField[0] as Record<string, unknown>)["title"] as string | undefined)
              : (coursesField as { title?: string } | undefined)?.title;
          return {
            id: String(c["id"] ?? ""),
            certificate_no: (c["certificate_no"] as string | null) ?? null,
            course_title: title ?? null,
          };
        }) ?? [];

      return {
        id: u.id,
        email: u.email ?? undefined,
        email_confirmed_at: u.email_confirmed_at ?? null,
        created_at: u.created_at ?? null,
        banned,
        full_name: p?.["full_name"] ?? null,
        age: p?.["age"] ?? null,
        highest_education: p?.["highest_education"] ?? null,
        country_code: p?.["country_code"] ?? null,
        country_name: p?.["country_name"] ?? null,
        certificates: userCerts,
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

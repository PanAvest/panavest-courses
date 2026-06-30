// app/api/certificates/email/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabaseServer";
import { sendEmailOnce } from "@/lib/email";
import { certificateEmail } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ certificate_id: z.string().uuid() });

function appUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin || "https://panavestkds.com";
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const certId = parsed.data.certificate_id;

  // Authenticate the caller — only the certificate's owner may trigger its email.
  const authed = getSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Load the certificate.
  const { data: cert, error: certErr } = await admin
    .from("certificates")
    .select("id, certificate_no, issued_at, score_pct, user_id, course_id")
    .eq("id", certId)
    .maybeSingle();
  if (certErr) return NextResponse.json({ ok: false, error: certErr.message }, { status: 500 });
  if (!cert) return NextResponse.json({ ok: false, error: "Certificate not found." }, { status: 404 });

  const c = cert as {
    id: string;
    certificate_no: string | null;
    issued_at: string | null;
    score_pct: number | null;
    user_id: string | null;
    course_id: string | null;
  };

  // Only the owner may email their own certificate.
  if (c.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  // Resolve name, course title, and email.
  const [profileRes, courseRes, userRes] = await Promise.all([
    c.user_id
      ? admin.from("profiles").select("full_name").eq("id", c.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    c.course_id
      ? admin.from("courses").select("title").eq("id", c.course_id).maybeSingle()
      : Promise.resolve({ data: null }),
    c.user_id ? admin.auth.admin.getUserById(c.user_id) : Promise.resolve({ data: { user: null } }),
  ]);

  const fullName =
    (profileRes.data as { full_name?: string | null } | null)?.full_name?.trim() || "Graduate";
  const courseTitle = (courseRes.data as { title?: string | null } | null)?.title || "your course";
  const email = (userRes as { data?: { user?: { email?: string | null } | null } }).data?.user?.email;

  if (!email) {
    return NextResponse.json({ ok: false, error: "No email on file for this user." }, { status: 200 });
  }

  const base = appUrl(req);
  const result = await sendEmailOnce(
    admin,
    { ref: c.id, kind: "certificate", to: email },
    () =>
      certificateEmail({
        fullName,
        courseTitle,
        certificateNo: c.certificate_no || c.id,
        scorePct: c.score_pct,
        issuedAt: c.issued_at,
        verifyUrl: `${base}/verify?cert_id=${encodeURIComponent(c.id)}`,
        downloadUrl: `${base}/dashboard`,
      }),
  );

  return NextResponse.json({ ok: result.ok, skipped: result.skipped ?? false });
}

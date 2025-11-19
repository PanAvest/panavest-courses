import { NextResponse } from "next/server";

import { generateCertificateNumber } from "@/lib/certificates";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseRouteHandlerClient } from "@/lib/supabaseServer";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "CERT_ID_REQUIRED" }, { status: 400 });
  }

  const supabase = getSupabaseRouteHandlerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: cert } = await admin
    .from("certificates")
    .select("id,user_id")
    .eq("id", id)
    .maybeSingle();

  if (!cert || cert.user_id !== user.id) {
    return NextResponse.json({ error: "CERT_NOT_FOUND" }, { status: 404 });
  }

  const certificate_no = generateCertificateNumber();
  const { data: updated, error: updateErr } = await admin
    .from("certificates")
    .update({ certificate_no })
    .eq("id", id)
    .select("id,certificate_no")
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ error: "CERT_REFRESH_FAILED", details: updateErr?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, certificate_no: updated.certificate_no });
}

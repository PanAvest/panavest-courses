import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req) {
  const form = await req.formData();
  const file = form.get("file");
  const name = String(form.get("name") || "");
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "public";
  if (!(file instanceof File) || !name) {
    return NextResponse.json({ error: "file and name required" }, { status: 400 });
  }
  const ab = await file.arrayBuffer();
  const path = `admin/${Date.now()}-${name}`;
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(bucket).upload(path, Buffer.from(ab), {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ path, publicUrl: data.publicUrl });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "public";
const FOLDER = process.env.NEXT_PUBLIC_UPLOADS_FOLDER || "admin-uploads";

function sanitizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing 'file' in form-data" }, { status: 400 });
    }

    const providedName = form.get("name");
    const originalName =
      (typeof providedName === "string" && providedName.trim()) ||
      // @ts-expect-error File.name exists at runtime in Node 18+
      (file as any).name ||
      "upload.bin";

    const clean = sanitizeName(originalName);
    const key = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${clean}`;

    const admin = getSupabaseAdmin();

    // Best-effort create bucket if missing; ignore conflict
    try {
      await admin.storage.createBucket(BUCKET, { public: true });
    } catch { /* bucket likely exists */ }

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(key, file, {
        upsert: true,
        // @ts-expect-error Blob.type is available at runtime
        contentType: (file as any).type || "application/octet-stream",
      });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data } = admin.storage.from(BUCKET).getPublicUrl(key);
    if (!data?.publicUrl) return NextResponse.json({ error: "Could not obtain public URL" }, { status: 500 });

    return NextResponse.json({ publicUrl: data.publicUrl, bucket: BUCKET, path: key });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

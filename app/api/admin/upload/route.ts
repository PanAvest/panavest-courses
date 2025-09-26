import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "public";
const FOLDER = process.env.NEXT_PUBLIC_UPLOADS_FOLDER || "admin-uploads";

/** Blob with optional name/type (avoids `any`) */
type MaybeFile = Blob & { name?: string; type?: string };

function sanitizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const blob = form.get("file");
    if (!(blob instanceof Blob)) {
      return NextResponse.json({ error: "Missing 'file' in form-data" }, { status: 400 });
    }
    const file = blob as MaybeFile;

    const provided = form.get("name");
    const providedStr = typeof provided === "string" ? provided.trim() : "";
    const originalName = providedStr || file.name || "upload.bin";
    const contentType = file.type && typeof file.type === "string" ? file.type : "application/octet-stream";

    const clean = sanitizeName(originalName);
    const key = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${clean}`;

    const admin = getSupabaseAdmin();

    // Try to create bucket (ignore if it already exists)
    try { await admin.storage.createBucket(BUCKET, { public: true }); } catch {}

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(key, file, { upsert: true, contentType });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data } = admin.storage.from(BUCKET).getPublicUrl(key);
    if (!data?.publicUrl) return NextResponse.json({ error: "Could not obtain public URL" }, { status: 500 });

    return NextResponse.json({ publicUrl: data.publicUrl, bucket: BUCKET, path: key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

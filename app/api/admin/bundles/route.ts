// app/api/admin/bundles/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BundleSchema = z.object({
  id: z.string().uuid().optional(),
  course_id: z.string().uuid(),
  ebook_id: z.string().uuid(),
  active: z.boolean().default(true),
});

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("program_ebook_links")
    .select("id,course_id,ebook_id,active,created_at,courses:course_id(id,slug,title),ebooks:ebook_id(id,slug,title)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = adminClient();
  const json = await req.json().catch(() => null);
  const parsed = BundleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("program_ebook_links")
    .upsert(
      { ...payload },
      { onConflict: "course_id,ebook_id" },
    )
    .select("id,course_id,ebook_id,active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? payload);
}

export async function DELETE(req: Request) {
  const supabase = adminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("program_ebook_links").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

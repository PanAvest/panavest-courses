import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/getSupabaseAdmin()";

export async function PUT(req: Request) {
  const body = await req.json();
  const { error } = await getSupabaseAdmin()
    .from("site_settings")
    .update({
      hero_title: body.hero_title ?? null,
      hero_subtitle: body.hero_subtitle ?? null,
      primary_color: body.primary_color ?? null,
      accent_color: body.accent_color ?? null,
      bg_color: body.bg_color ?? null,
      text_color: body.text_color ?? null,
      social: body.social ?? {},
      footer_copy: body.footer_copy ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "00000000-0000-0000-0000-000000000001");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

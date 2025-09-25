import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { action, email } = (await req.json()) as { action: "generate_confirmation_link"; email: string };
  if (action !== "generate_confirmation_link" || !email) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data.properties?.action_link ?? null });
}

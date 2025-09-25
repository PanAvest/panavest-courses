import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? {});
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  const body = (await req.json()) as unknown;
  const obj = (typeof body === "object" && body) ? (body as Record<string, unknown>) : {};
  const action = obj["action"] === "generate_confirmation_link" ? "generate_confirmation_link" : "";
  const email  = typeof obj["email"] === "string" ? obj["email"] : "";
  if (!action || !email) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data?.properties?.action_link ?? null });
}

import { NextResponse, type NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return NextResponse.json({ error: "No deploy hook configured" }, { status: 400 });
  const res = await fetch(hook, { method: "POST" });
  const text = await res.text();
  return NextResponse.json({ ok: res.ok, text });
}

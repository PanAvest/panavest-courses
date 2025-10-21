import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/ebooks/secure-pdf?ebookId=...  or  ?slug=...
 * - Requires logged-in user (via Supabase access-token cookie)
 * - Requires a 'paid' row in ebook_purchases for this user+ebook
 * - Proxies/streams the real PDF without exposing its origin URL
 */
export async function GET(req: NextRequest) {
  // In your Next version, cookies() is async
  const cookieStore = await cookies();

  // Try common Supabase cookie names (adjust if your project uses different names)
  const accessToken =
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb:token")?.value || // legacy helper naming
    null;

  if (!accessToken) {
    return NextResponse.json({ error: "Auth required" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Validate token -> user
  const { data: authUser, error: authErr } = await admin.auth.getUser(accessToken);
  if (authErr || !authUser?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const userId = authUser.user.id;

  const url = new URL(req.url);
  const ebookId = url.searchParams.get("ebookId");
  const slug = url.searchParams.get("slug");
  if (!ebookId && !slug) {
    return NextResponse.json({ error: "Missing ebookId or slug" }, { status: 400 });
  }

  // Build query, THEN call maybeSingle()
  let query = admin.from("ebooks").select("id, sample_url");
  query = ebookId ? query.eq("id", ebookId) : query.eq("slug", slug!);
  const { data: ebook, error: ebookErr } = await query.maybeSingle();

  if (ebookErr || !ebook) {
    return NextResponse.json({ error: "E-book not found" }, { status: 404 });
  }

  // Ownership check (server-side)
  const { data: purchase, error: pErr } = await admin
    .from("ebook_purchases")
    .select("status")
    .eq("user_id", userId)
    .eq("ebook_id", ebook.id)
    .eq("status", "paid")
    .maybeSingle();

  if (pErr || !purchase) {
    return NextResponse.json({ error: "Not purchased" }, { status: 403 });
  }

  if (!ebook.sample_url) {
    return NextResponse.json({ error: "PDF unavailable" }, { status: 404 });
  }

  // Proxy fetch with Range support for PDF
  const range = req.headers.get("range") || undefined;
  const upstream = await fetch(ebook.sample_url, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  });

  const headers = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (["content-type", "content-length", "accept-ranges", "content-range"].includes(k.toLowerCase())) {
      headers.set(k, v);
    }
  }
  headers.set("cache-control", "no-store");

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

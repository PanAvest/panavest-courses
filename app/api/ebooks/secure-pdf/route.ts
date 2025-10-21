import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";        // ensure Node runtime (streaming ok)
export const dynamic = "force-dynamic"; // don’t cache this route

function supabaseForToken(accessToken: string) {
  // Use anon key but forward user's token so RLS runs as the user
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ebookId = searchParams.get("ebookId");
    if (!ebookId) {
      return NextResponse.json({ error: "ebookId required" }, { status: 400 });
    }

    // 1) Get access token (Authorization header preferred; fallback to cookie)
    const authHeader = req.headers.get("authorization") || "";
    let token = "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
    if (!token) {
      // Next 15 cookies() can be async; use await to be safe
      const jar = await cookies();
      token = jar.get("sb-access-token")?.value || "";
    }
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sb = supabaseForToken(token);

    // 2) Confirm user identity from token
    const { data: userInfo, error: userErr } = await sb.auth.getUser();
    if (userErr || !userInfo?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = userInfo.user.id;

    // 3) Load ebook (must be published and have a sample_url)
    const { data: ebook, error: ebookErr } = await sb
      .from("ebooks")
      .select("id, published, sample_url")
      .eq("id", ebookId)
      .maybeSingle();

    if (ebookErr) {
      return NextResponse.json({ error: `DB error: ${ebookErr.message}` }, { status: 500 });
    }
    if (!ebook || ebook.published !== true) {
      return NextResponse.json({ error: "Ebook not found or not published" }, { status: 404 });
    }
    if (!ebook.sample_url) {
      return NextResponse.json({ error: "No PDF available for this ebook" }, { status: 404 });
    }

    // 4) Verify ownership (status must be 'paid')
    const { data: purchase, error: pErr } = await sb
      .from("ebook_purchases")
      .select("status")
      .eq("user_id", userId)
      .eq("ebook_id", ebookId)
      .maybeSingle();

    // If there’s no row or status isn’t 'paid', deny access.
    const isOwner = !pErr && purchase?.status === "paid";
    if (!isOwner) {
      return NextResponse.json({ error: "Not purchased" }, { status: 403 });
    }

    // 5) Fetch the actual PDF bytes from storage/public URL
    const upstream = await fetch(ebook.sample_url, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: 502 }
      );
    }

    // 6) Stream it back
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("X-Accel-Buffering", "no"); // avoid buffering on proxies

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Server error" },
      { status: 500 }
    );
  }
}

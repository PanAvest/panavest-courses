// app/api/ebooks/secure-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supabaseForToken(accessToken: string) {
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

    // Token from header or cookie
    const authHeader = req.headers.get("authorization") || "";
    let token = "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
    if (!token) {
      const jar = await cookies();
      token = jar.get("sb-access-token")?.value || "";
    }
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sb = supabaseForToken(token);

    // Confirm user
    const { data: userInfo, error: userErr } = await sb.auth.getUser();
    if (userErr || !userInfo?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = userInfo.user.id;

    // Get ebook metadata, be liberal on fields to avoid breaking
    const { data: ebook, error: ebookErr } = await sb
      .from("ebooks")
      .select("id, published, bucket, file_path, paid_url, sample_url")
      .eq("id", ebookId)
      .maybeSingle();

    if (ebookErr) {
      return NextResponse.json({ error: `DB error: ${ebookErr.message}` }, { status: 500 });
    }
    if (!ebook || ebook.published !== true) {
      return NextResponse.json({ error: "Ebook not found or not published" }, { status: 404 });
    }

    // Ownership
    const { data: purchase, error: pErr } = await sb
      .from("ebook_purchases")
      .select("status")
      .eq("user_id", userId)
      .eq("ebook_id", ebookId)
      .maybeSingle();

    const isOwner = !pErr && purchase?.status === "paid";
    if (!isOwner) {
      return NextResponse.json({ error: "Not purchased" }, { status: 403 });
    }

    // Resolve upstream: prefer private storage signed URL, else paid_url, else sample_url
    let upstreamUrl: string | null = null;

    if (ebook?.bucket && ebook?.file_path) {
      const admin = getSupabaseAdmin();
      const { data: signed, error: signErr } = await admin
        .storage
        .from(ebook.bucket as string)
        .createSignedUrl(ebook.file_path as string, 60);
      if (!signErr && signed?.signedUrl) {
        upstreamUrl = signed.signedUrl;
      }
    }

    if (!upstreamUrl && ebook?.paid_url) {
      upstreamUrl = ebook.paid_url as string;
    }
    if (!upstreamUrl && ebook?.sample_url) {
      upstreamUrl = ebook.sample_url as string;
    }

    if (!upstreamUrl) {
      return NextResponse.json({ error: "No PDF available for this ebook" }, { status: 404 });
    }

    const upstream = await fetch(upstreamUrl, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("X-Accel-Buffering", "no");

    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Server error" }, { status: 500 });
  }
}

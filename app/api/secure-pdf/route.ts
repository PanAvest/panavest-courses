// app/api/secure-pdf/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const src = url.searchParams.get("src");
  if (!src) return NextResponse.json({ error: "Missing src" }, { status: 400 });

  // Pass through Range header for partial content (PDF.js likes this)
  const range = req.headers.get("range") || undefined;

  const upstream = await fetch(src, {
    headers: {
      Accept: "application/pdf",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
    // credentials omitted intentionally; this is for public/signed PDF URLs
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Upstream error ${upstream.status}` }, { status: 502 });
  }

  // Mirror important headers; allow partial responses
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "application/pdf");
  headers.set("Cache-Control", "no-store");
  const cl = upstream.headers.get("content-length");
  if (cl) headers.set("Content-Length", cl);
  const cr = upstream.headers.get("content-range");
  if (cr) headers.set("Content-Range", cr);
  const ar = upstream.headers.get("accept-ranges");
  if (ar) headers.set("Accept-Ranges", ar);
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Content-Disposition", "inline");

  return new NextResponse(upstream.body, {
    status: upstream.status, // 200 or 206 for ranged
    headers,
  });
}

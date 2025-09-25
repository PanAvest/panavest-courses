import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (!(p.startsWith("/admin") || p.startsWith("/api/admin"))) return NextResponse.next();

  const hdr = req.headers.get("authorization") ?? "";
  const [scheme, b64] = hdr.split(" ");
  if (scheme !== "Basic" || !b64) return unauthorized();

  let decoded = "";
  try { decoded = atob(b64); } catch { return unauthorized(); }
  const [u, ...rest] = decoded.split(":");
  const pw = rest.join(":");

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) return unauthorized();
  if (u !== process.env.ADMIN_USER || pw !== process.env.ADMIN_PASS) return unauthorized();

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

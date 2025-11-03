export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return Response.json({
    project: process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "unknown",
    hasUrl: !!url, hasAnon: !!anon, hasService: !!svc,
    urlSample: url.slice(0, 40), anonSample: anon.slice(0, 8),
  });
}

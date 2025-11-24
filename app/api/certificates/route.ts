import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Legacy route: certificates are now issued client-side via Supabase browser SDK.
export async function POST() {
  return NextResponse.json(
    { error: "LEGACY_DISABLED", message: "Use client-side issuance for certificates." },
    { status: 405 },
  );
}

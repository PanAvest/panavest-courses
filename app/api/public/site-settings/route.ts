import { NextResponse } from "next/server";

import { getSiteSettingsCached } from "@/app/lib/public-data";

export async function GET() {
  try {
    const data = await getSiteSettingsCached();
    return NextResponse.json(data ?? null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

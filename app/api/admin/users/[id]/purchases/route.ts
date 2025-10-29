import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  // Replace with real joins to your purchases tables later
  return NextResponse.json({ courses: [], ebooks: [] });
}

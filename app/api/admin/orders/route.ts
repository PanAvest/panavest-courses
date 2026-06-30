// app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "2000");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 5000) : 2000;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("physical_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Table not created yet → return an empty list so the admin UI still loads.
    const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    if (text.includes("physical_orders") || error.code === "42P01" || text.includes("does not exist")) {
      return NextResponse.json({ orders: [], setup_required: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}

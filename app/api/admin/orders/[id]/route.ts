// app/api/admin/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { decrementStock, incrementStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

const PatchBody = z.object({
  status: z.enum(["new", "processing", "fulfilled", "cancelled"]).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const CANCELLED = "cancelled";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Load the current order so we can adjust stock on cancel / un-cancel transitions.
  const { data: existing, error: loadErr } = await admin
    .from("physical_orders")
    .select("id, status, quantity, ebook_id")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const prev = existing as { status: string; quantity: number; ebook_id: string | null };
  const nextStatus = parsed.data.status ?? prev.status;

  const wasCancelled = prev.status === CANCELLED;
  const willBeCancelled = nextStatus === CANCELLED;

  // Reopening a cancelled order RE-TAKES stock — reserve it atomically first so
  // we never promise copies that are no longer available.
  if (prev.ebook_id && wasCancelled && !willBeCancelled) {
    const reserved = await decrementStock(admin, prev.ebook_id, prev.quantity);
    if (!reserved) {
      return NextResponse.json(
        { error: "Not enough stock to reopen this order." },
        { status: 409 },
      );
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  const { error: updErr } = await admin.from("physical_orders").update(update).eq("id", id);
  if (updErr) {
    // Undo the re-take if the status write failed.
    if (prev.ebook_id && wasCancelled && !willBeCancelled) {
      await incrementStock(admin, prev.ebook_id, prev.quantity);
    }
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Cancelling an active order RETURNS its reserved stock (relative, race-safe).
  if (prev.ebook_id && !wasCancelled && willBeCancelled) {
    await incrementStock(admin, prev.ebook_id, prev.quantity);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Return reserved stock for non-cancelled orders before deleting.
  const { data: existing } = await admin
    .from("physical_orders")
    .select("status, quantity, ebook_id")
    .eq("id", id)
    .maybeSingle();
  const ord = existing as { status: string; quantity: number; ebook_id: string | null } | null;
  if (ord && ord.ebook_id && ord.status !== CANCELLED) {
    // Return the reserved units before removing the order (relative, race-safe).
    await incrementStock(admin, ord.ebook_id, ord.quantity);
  }

  const { error } = await admin.from("physical_orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

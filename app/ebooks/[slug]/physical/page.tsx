"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { GHANA_REGIONS, citiesForRegion } from "@/lib/ghana";

const BRAND = "#b65437";

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  price_cents: number;
  physical_price_cents?: number | null;
  stock_quantity?: number | null;
  show_stock?: boolean | null;
};

type Fulfillment = "delivery" | "pickup";

type VoucherState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "applied"; code: string; discountCents: number; label: string }
  | { kind: "error"; message: string };

const ghc = (cents: number) => `GH₵ ${(cents / 100).toFixed(2)}`;

export default function PhysicalOrderPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [notes, setNotes] = useState("");

  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<VoucherState>({ kind: "idle" });

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ ref: string; total: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/ebooks/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Could not load this title.");
        if (active) setEbook(j as Ebook);
      } catch (e) {
        if (active) setLoadErr((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const cities = useMemo(() => citiesForRegion(region), [region]);

  const unitPrice =
    ebook?.physical_price_cents != null && ebook.physical_price_cents > 0
      ? ebook.physical_price_cents
      : ebook?.price_cents ?? 0;
  const subtotal = unitPrice * Math.max(1, quantity);
  const discountCents = voucher.kind === "applied" ? Math.min(subtotal, voucher.discountCents) : 0;
  const total = Math.max(0, subtotal - discountCents);

  const stockTracked = ebook ? typeof ebook.stock_quantity === "number" : false;
  const stockLeft = stockTracked ? (ebook?.stock_quantity as number) : null;
  const outOfStock = stockTracked && (stockLeft ?? 0) <= 0;

  // Re-validate the voucher whenever the subtotal changes (quantity etc.).
  useEffect(() => {
    if (voucher.kind !== "applied") return;
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/vouchers/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: voucher.code, subtotal_cents: subtotal }),
        });
        const j = await r.json();
        if (!active) return;
        if (j?.ok) {
          setVoucher({ kind: "applied", code: j.code, discountCents: j.discount_cents, label: j.label });
        } else {
          setVoucher({ kind: "error", message: j?.error || "Voucher no longer valid." });
        }
      } catch {
        /* keep current */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  async function applyVoucher() {
    const code = voucherInput.trim();
    if (!code) return;
    setVoucher({ kind: "checking" });
    try {
      const r = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal_cents: subtotal }),
      });
      const j = await r.json();
      if (j?.ok) {
        setVoucher({ kind: "applied", code: j.code, discountCents: j.discount_cents, label: j.label });
      } else {
        setVoucher({ kind: "error", message: j?.error || "Invalid voucher code." });
      }
    } catch {
      setVoucher({ kind: "error", message: "Could not check voucher. Try again." });
    }
  }

  function clearVoucher() {
    setVoucher({ kind: "idle" });
    setVoucherInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);

    if (!name.trim()) return setSubmitErr("Please enter your full name.");
    if (!email.trim()) return setSubmitErr("Please enter your email.");
    if (!phone.trim()) return setSubmitErr("Please enter your phone number.");
    if (quantity < 1) return setSubmitErr("Quantity must be at least 1.");
    if (fulfillment === "delivery") {
      if (!region) return setSubmitErr("Please select your region.");
      if (!city) return setSubmitErr("Please select your city/town.");
      if (!street.trim()) return setSubmitErr("Please enter your street / house address.");
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/orders/physical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ebook_slug: slug,
          customer_name: name,
          email,
          phone,
          quantity,
          fulfillment,
          region: fulfillment === "delivery" ? region : null,
          city: fulfillment === "delivery" ? city : null,
          street: fulfillment === "delivery" ? street : null,
          voucher_code: voucher.kind === "applied" ? voucher.code : null,
          notes,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Could not place your order.");
      setDone({ ref: j.order_ref, total: j.total_cents });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg bg-white px-3 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-red)]";

  if (loadErr) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Title unavailable</h1>
        <p className="mt-2 text-muted">{loadErr}</p>
        <Link href="/ebooks" className="mt-6 inline-block rounded-lg px-5 py-2.5 text-white" style={{ background: BRAND }}>
          Back to E-Books
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(46,160,67,0.12)", color: "#1a7f37" }}
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold">Order received!</h1>
          <p className="mt-2 text-muted">
            Thank you, {name.split(" ")[0] || "friend"}. Your order reference is{" "}
            <span className="font-semibold text-ink">{done.ref}</span>.
          </p>
          <p className="mt-2 text-sm text-muted">
            Our team will contact you on <span className="font-medium">{phone}</span> to confirm{" "}
            {fulfillment === "pickup" ? "pickup" : "delivery"} and arrange payment of{" "}
            <span className="font-semibold text-ink">{ghc(done.total)}</span> for the book(s).
          </p>
          <div className="mt-4 rounded-lg bg-[color:var(--color-bg)] p-3 text-xs text-muted">
            Delivery charges (where applicable) are arranged separately and paid by the customer on delivery.
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/ebooks" className="rounded-lg px-5 py-2.5 text-white" style={{ background: BRAND }}>
              Browse more books
            </Link>
            <Link
              href={`/ebooks/${encodeURIComponent(slug)}`}
              className="rounded-lg border border-[color:var(--color-light)] bg-white px-5 py-2.5"
            >
              Back to title
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-10 animate-fade-up">
      <Link href={`/ebooks/${encodeURIComponent(slug)}`} className="text-sm text-muted hover:text-ink">
        ← Back to title
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Buy a physical copy</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Order a printed copy delivered to you or ready for pickup. Fill in your details below and our team will
        reach out to confirm and arrange payment.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ── Form ── */}
        <form onSubmit={submit} className="grid gap-5">
          <fieldset className="rounded-2xl bg-white p-5 shadow-sm">
            <legend className="px-2 text-sm font-semibold text-ink">Your details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs text-muted">Full name *</span>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Phone number *</span>
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="e.g. 024 123 4567"
                  required
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs text-muted">Email *</span>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted">Quantity (number of books) *</span>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={stockTracked ? Math.max(1, stockLeft ?? 1) : 999}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  required
                />
                {stockTracked && stockLeft != null && stockLeft > 0 && (
                  <span className="text-[11px] text-muted">{stockLeft} available</span>
                )}
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl bg-white p-5 shadow-sm">
            <legend className="px-2 text-sm font-semibold text-ink">How would you like to receive it?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["delivery", "pickup"] as Fulfillment[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFulfillment(f)}
                  className={`rounded-xl border p-3 text-left text-sm transition ${
                    fulfillment === f
                      ? "border-[color:var(--color-accent-red)] bg-[color:var(--color-accent-red)]/8"
                      : "border-[color:var(--color-light)] bg-white hover:bg-[color:var(--color-bg)]"
                  }`}
                >
                  <div className="font-semibold capitalize">{f}</div>
                  <div className="text-xs text-muted">
                    {f === "delivery" ? "Courier to your address" : "Collect at our office"}
                  </div>
                </button>
              ))}
            </div>

            {fulfillment === "delivery" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Region *</span>
                  <select
                    className={inputClass}
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setCity("");
                    }}
                    required
                  >
                    <option value="">— Select region —</option>
                    {GHANA_REGIONS.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted">City / Town *</span>
                  <select
                    className={inputClass}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!region}
                    required
                  >
                    <option value="">{region ? "— Select city/town —" : "Select a region first"}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-xs text-muted">Street / House address *</span>
                  <input
                    className={inputClass}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="House number, street, landmark"
                    required
                  />
                </label>
              </div>
            )}

            {fulfillment === "pickup" && (
              <p className="mt-4 rounded-lg bg-[color:var(--color-bg)] p-3 text-xs text-muted">
                We&apos;ll share the pickup location and hours when we call to confirm your order.
              </p>
            )}

            <label className="mt-4 grid gap-1">
              <span className="text-xs text-muted">Notes (optional)</span>
              <textarea
                className="min-h-[72px] w-full rounded-lg bg-white px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-red)]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything we should know?"
              />
            </label>
          </fieldset>

          {submitErr && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{submitErr}</div>
          )}

          <button
            type="submit"
            disabled={submitting || outOfStock}
            className="flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: BRAND }}
          >
            {outOfStock ? "Out of stock" : submitting ? "Placing order…" : "Place order"}
          </button>
        </form>

        {/* ── Summary ── */}
        <aside className="lg:sticky lg:top-24 h-max">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              {ebook?.cover_url ? (
                <Image
                  src={ebook.cover_url}
                  alt={ebook.title}
                  width={64}
                  height={84}
                  className="h-[84px] w-[64px] rounded-md object-cover"
                />
              ) : (
                <div className="h-[84px] w-[64px] rounded-md bg-[color:var(--color-light)]/40" />
              )}
              <div className="min-w-0">
                <div className="font-semibold leading-tight">{ebook?.title ?? "Loading…"}</div>
                <div className="mt-1 text-sm text-muted">{ghc(unitPrice)} each</div>
                {stockTracked && ebook?.show_stock && stockLeft != null && (
                  <div className="mt-1 text-xs text-muted">
                    {stockLeft > 0 ? `${stockLeft} in stock` : "Out of stock"}
                  </div>
                )}
              </div>
            </div>

            {/* Voucher */}
            <div className="mt-5 border-t border-[color:var(--color-light)] pt-4">
              <div className="text-xs font-medium text-ink">Discount voucher</div>
              {voucher.kind === "applied" ? (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
                  <span>
                    <span className="font-semibold">{voucher.code}</span> · {voucher.label}
                  </span>
                  <button type="button" onClick={clearVoucher} className="text-xs underline">
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="h-10 w-full rounded-lg bg-white px-3 text-sm uppercase ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-red)]"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      placeholder="Enter code"
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      disabled={voucher.kind === "checking" || !voucherInput.trim()}
                      className="shrink-0 rounded-lg border border-[color:var(--color-light)] bg-white px-3 text-sm font-medium hover:bg-[color:var(--color-bg)] disabled:opacity-50"
                    >
                      {voucher.kind === "checking" ? "…" : "Apply"}
                    </button>
                  </div>
                  {voucher.kind === "error" && (
                    <div className="mt-1 text-xs text-red-600">{voucher.message}</div>
                  )}
                </>
              )}
            </div>

            {/* Totals */}
            <div className="mt-5 space-y-2 border-t border-[color:var(--color-light)] pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">
                  Subtotal ({quantity} × {ghc(unitPrice)})
                </span>
                <span className="font-medium">{ghc(subtotal)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span className="font-medium">− {ghc(discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[color:var(--color-light)] pt-2 text-base font-bold">
                <span>Total (books)</span>
                <span>{ghc(total)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-[color:var(--color-bg)] p-3 text-xs text-muted">
              <span className="font-semibold text-ink">Please note:</span> delivery charges are not included above.
              Delivery is arranged separately and the cost is paid by the customer on delivery. Pickup orders have no
              delivery charge.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

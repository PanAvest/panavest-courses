import { NextRequest } from "next/server";

type CourseMeta = {
  kind: "course";
  user_id: string;
  course_id: string;
  slug: string;
  [k: string]: unknown;
};

type InitBody = {
  email: string;
  amountMinor?: number; // minor units (e.g. pesewas)
  amount?: number;      // major units (e.g. GHS)
  currency?: string;
  meta?: CourseMeta;    // optional in type; we’ll narrow it
};

const MINOR_UNIT: Record<string, number> = { GHS: 100, NGN: 100, USD: 100 };

function siteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;
  if (!envUrl) return "http://localhost:3000";
  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

export async function POST(req: NextRequest) {
  try {
    const sk = process.env.PAYSTACK_SECRET_KEY;
    if (!sk) {
      return Response.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 400 });
    }

    const body = (await req.json()) as InitBody;
    const { email, amountMinor, amount, currency = "GHS" } = body ?? {};
    const metaRaw = body?.meta;

    const missing: string[] = [];
    if (!email) missing.push("email");
    if (!metaRaw) missing.push("meta");
    if (!metaRaw?.user_id) missing.push("meta.user_id");
    if (!metaRaw?.course_id) missing.push("meta.course_id");
    if (!metaRaw?.slug) missing.push("meta.slug");

    const factor = MINOR_UNIT[currency.toUpperCase()] ?? 100;
    const minor =
      typeof amountMinor === "number"
        ? Math.round(amountMinor)
        : typeof amount === "number"
        ? Math.round(amount * factor)
        : undefined;

    if (!minor || minor <= 0) missing.push("amountMinor (or amount)");

    if (missing.length) {
      return Response.json(
        { ok: false, error: `Missing fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ meta is guaranteed now; narrow for TS
    const meta = metaRaw as Required<Pick<CourseMeta, "slug" | "user_id" | "course_id">> & CourseMeta;

    const callback_url = `${siteUrl()}/knowledge/${encodeURIComponent(meta.slug)}/enroll?verify=1`;

    const payload = {
      email,
      amount: minor,
      currency: currency.toUpperCase(),
      callback_url,
      metadata: meta,
    };

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await psRes.json().catch(() => ({} as any));
    if (!psRes.ok || !json?.status) {
      return Response.json(
        { ok: false, error: json?.message || "Failed to initialize with Paystack", details: json },
        { status: 400 }
      );
    }

    const data = json.data || {};
    return Response.json(
      { ok: true, authorization_url: data.authorization_url, reference: data.reference, access_code: data.access_code },
      { status: 200 }
    );
  } catch {
    return Response.json({ ok: false, error: "Server error initializing payment" }, { status: 500 });
  }
}

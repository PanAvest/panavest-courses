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
  meta?: CourseMeta;
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

    // meta is now guaranteed
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

    // Parse JSON without `any`
    let parsed: unknown = null;
    try {
      parsed = await psRes.json();
    } catch {
      parsed = null;
    }

    const obj = (parsed && typeof parsed === "object") ? (parsed as Record<string, unknown>) : {};
    const statusVal = typeof obj["status"] === "boolean" ? (obj["status"] as boolean) : undefined;
    const message = typeof obj["message"] === "string" ? (obj["message"] as string) : undefined;

    const dataObj =
      obj["data"] && typeof obj["data"] === "object"
        ? (obj["data"] as Record<string, unknown>)
        : undefined;

    const authorization_url =
      dataObj && typeof dataObj["authorization_url"] === "string"
        ? (dataObj["authorization_url"] as string)
        : undefined;

    const access_code =
      dataObj && typeof dataObj["access_code"] === "string"
        ? (dataObj["access_code"] as string)
        : undefined;

    const reference =
      dataObj && typeof dataObj["reference"] === "string"
        ? (dataObj["reference"] as string)
        : undefined;

    if (!psRes.ok || statusVal === false || !authorization_url) {
      return Response.json(
        { ok: false, error: message || "Failed to initialize with Paystack", details: obj },
        { status: 400 }
      );
    }

    return Response.json(
      { ok: true, authorization_url, reference, access_code },
      { status: 200 }
    );
  } catch {
    return Response.json({ ok: false, error: "Server error initializing payment" }, { status: 500 });
  }
}

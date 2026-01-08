import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type VerifyPageProps = {
  searchParams?: Promise<{ cert_id?: string | string[] }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const raw = params?.cert_id;
  const certId = Array.isArray(raw) ? raw[0] : raw;

  const supabase = createClient();
  let error: string | null = null;
  let cert:
    | {
        id: string;
        certificate_no: string | null;
        issued_at: string | null;
        user_id: string | null;
        course_id: string | null;
        full_name: string | null;
        course_title: string | null;
      }
    | null = null;

  if (!certId) {
    error = "No certificate ID provided.";
  } else {
    try {
      const { data: baseCert, error: baseErr } = await supabase
        .from("certificates")
        .select("id, certificate_no, issued_at, user_id, course_id")
        .eq("id", certId)
        .maybeSingle();
      if (baseErr) throw baseErr;
      if (!baseCert) {
        error = "Certificate not found or invalid.";
      } else {
        const [profileRes, courseRes] = await Promise.all([
          baseCert.user_id
            ? supabase.from("profiles").select("full_name").eq("id", baseCert.user_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          baseCert.course_id
            ? supabase.from("courses").select("title").eq("id", baseCert.course_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (profileRes.error) console.error("verify profile fetch error", profileRes.error);
        if (courseRes.error) console.error("verify course fetch error", courseRes.error);

        cert = {
          id: baseCert.id,
          certificate_no: baseCert.certificate_no ?? null,
          issued_at: baseCert.issued_at ?? null,
          user_id: baseCert.user_id ?? null,
          course_id: baseCert.course_id ?? null,
          full_name: (profileRes.data as { full_name: string | null } | null)?.full_name ?? null,
          course_title: (courseRes.data as { title: string | null } | null)?.title ?? null,
        };
      }
    } catch (e) {
      console.error("verify error", e);
      error = "Could not verify this certificate. Please try again.";
    }
  }

  const contactHref = `mailto:support@panavestkds.com?subject=Certificate%20Verification%20Help&body=Certificate%20ID:%20${encodeURIComponent(
    certId ?? "",
  )}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Certificate Verification</h1>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200/40 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-sm">
          <p className="font-semibold">Could not verify this certificate.</p>
          <p className="mt-1 text-red-700">{error}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {certId && <span className="rounded bg-white/70 px-2 py-1 text-xs font-mono text-red-700">ID: {certId}</span>}
            <a
              href={contactHref}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
            >
              Contact us for help
            </a>
          </div>
        </div>
      )}

      {!error && cert && (
        <div className="mt-6 rounded-xl border border-green-200/40 bg-white px-5 py-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold">✓</span>
            <span className="font-semibold">Verified certificate</span>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-800">
            <div>
              <span className="font-semibold">Certificate No:</span> {cert.certificate_no || cert.id}
            </div>
            <div>
              <span className="font-semibold">Name:</span> {cert.full_name || "—"}
            </div>
            <div>
              <span className="font-semibold">Course:</span> {cert.course_title || "—"}
            </div>
            <div>
              <span className="font-semibold">Issued:</span>{" "}
              {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

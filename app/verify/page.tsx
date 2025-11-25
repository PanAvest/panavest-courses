import { createClient } from "@/lib/supabase/server";

type CertRow = {
  id: string;
  certificate_no: string | null;
  issued_at: string | null;
  profiles: { full_name: string | null } | null;
  courses: { title: string | null } | null;
};

type VerifyPageProps = {
  searchParams: Promise<{ cert_id?: string | string[] }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const raw = params.cert_id;
  const certId = Array.isArray(raw) ? raw[0] : raw;
  let error: string | null = null;
  let cert: CertRow | null = null;

  if (!certId) {
    error = "No certificate ID provided.";
  } else {
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("certificates")
        .select("id, certificate_no, issued_at, profiles(full_name), courses(title)")
        .eq("id", certId)
        .maybeSingle();
      if (err) throw err;
      if (data) {
        cert = {
          id: data.id,
          certificate_no: data.certificate_no ?? null,
          issued_at: data.issued_at ?? null,
          profiles: data.profiles ? { full_name: data.profiles.full_name ?? null } : null,
          courses: data.courses ? { title: data.courses.title ?? null } : null,
        };
      } else {
        cert = null;
      }
      if (!cert) error = "Certificate not found.";
    } catch (e) {
      console.error("verify error", e);
      error = "Could not verify this certificate. Please try again.";
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Certificate Verification</h1>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {!error && cert && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Status: <span className="font-semibold text-green-700">Valid</span>
          </p>
          <div className="mt-3 space-y-2 text-sm text-gray-800">
            <div>
              <span className="font-semibold">Certificate ID:</span> {cert.certificate_no || cert.id}
            </div>
            <div>
              <span className="font-semibold">Name:</span> {cert.profiles?.full_name || "—"}
            </div>
            <div>
              <span className="font-semibold">Course:</span> {cert.courses?.title || "—"}
            </div>
            <div>
              <span className="font-semibold">Issued:</span>{" "}
              {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

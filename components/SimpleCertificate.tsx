import React, { forwardRef, useMemo } from "react";

/**
 * SimpleCertificate (A4 preview + print-only)
 * - Card-sized A4 landscape proportions (297 x 210 mm scaled to container)
 * - Single Print/Save button; no external links
 * - @media print hides everything except the certificate
 */
export type CertificateProps = {
  panavestLogo?: string;
  kdsLogo?: string;
  signature?: string;
  recipient: string;
  course: string;
  blurb?: string;
  signerName?: string;
  signerTitle?: string;
  date?: string | Date;
  certId?: string;
  accent?: string;
  className?: string;
  showPrint?: boolean;
  qrValue?: string;
  qrSize?: number;
  qrProvider?: "quickchart" | "goqr" | "none";
};

const fmt = (d?: string | Date) => {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return isNaN(+x)
    ? String(d)
    : x.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const genId = () => `KDS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const SVG_PLACEHOLDER =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='48'%3E%3Crect width='100%25' height='100%25' fill='none' stroke='gray'/%3E%3Ctext x='5' y='30' font-size='12' fill='gray'%3ESignature%20Unavailable%3C/text%3E%3C/svg%3E";

const SimpleCertificate = forwardRef<HTMLDivElement, CertificateProps>(
  (
    {
      panavestLogo =
        "https://icujvqmqwacpysxjfkxd.supabase.co/storage/v1/object/public/public/admin-uploads/Panavest.png",
      kdsLogo =
        "https://icujvqmqwacpysxjfkxd.supabase.co/storage/v1/object/public/public/admin-uploads/KDS.png",
      signature =
        "https://icujvqmqwacpysxjfkxd.supabase.co/storage/v1/object/public/public/admin-uploads/Prof%20Signature.png",
      recipient,
      course,
      blurb = "For successfully completing the prescribed curriculum and assessments.",
      signerName = "Prof. Douglas Boateng",
      signerTitle = "Executive Chairman, PanAvest International & KDS",
      date,
      certId,
      accent = "#0a1156",
      className = "",
      showPrint = true,
      qrValue,
      qrSize = 96,
      qrProvider = "quickchart",
    },
    ref
  ) => {
    const resolvedId = useMemo(() => certId || genId(), [certId]);
    const value = qrValue || resolvedId;
    const qrUrl = useMemo(() => {
      if (qrProvider === "none") return "";
      const d = encodeURIComponent(value);
      if (qrProvider === "goqr")
        return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${d}&margin=1`;
      return `https://quickchart.io/qr?text=${d}&size=${qrSize}&margin=1`;
    }, [value, qrProvider, qrSize]);

    const resolvedSignature = useMemo(
      () =>
        signature ||
        "https://icujvqmqwacpysxjfkxd.supabase.co/storage/v1/object/public/public/admin-uploads/Prof%20Signature.png",
      [signature],
    );

    const handlePrint = () => {
      if (typeof window !== "undefined") {
        window.print();
      }
    };

    return (
      <div className="w-full">
        <div
          ref={ref}
          className={`kds-cert-print-root bg-white shadow-lg rounded-xl relative ${className}`}
          style={{
            border: `6px solid ${accent}`,
            width: "100%",
            maxWidth: "1120px",
            aspectRatio: "297 / 210",
            margin: "0 auto",
            padding: "32px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
              <img src={panavestLogo} alt="PanAvest" className="h-14 w-auto" />
              <div className="text-center grow">
                <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: accent }}>
                  Certificate of Completion
                </p>
                <h1 className="mt-1 text-3xl font-serif font-bold">PanAvest Knowledge Development Series</h1>
              </div>
              <img src={kdsLogo} alt="KDS" className="h-14 w-auto" />
            </div>

            <div className="my-6 h-px" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

            {/* Recipient & Course */}
            <div className="text-center py-8 flex-1 flex flex-col justify-center">
              <p className="text-sm text-gray-600">This certifies that</p>
              <div className="mt-5 text-5xl font-serif font-bold" data-testid="recipient">
                {recipient}
              </div>
              <p className="mt-5 text-sm text-gray-600">has successfully completed</p>
              <div className="mt-3 text-2xl italic" data-testid="course">
                {course}
              </div>
              {blurb && (
                <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-700" data-testid="blurb">
                  {blurb}
                </p>
              )}
            </div>

            {/* Signature + QR */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10">
              <div className="flex flex-col items-start">
                <img
                  src={resolvedSignature}
                  alt="Prof. Douglas Boateng signature"
                  className="h-16 w-auto object-contain"
                  decoding="async"
                  loading="eager"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.src = SVG_PLACEHOLDER;
                  }}
                />
                <div className="mt-2 h-px bg-gray-400 w-44" />
                <p className="mt-1 font-medium text-gray-900">{signerName}</p>
                {signerTitle && <p className="text-xs text-gray-600">{signerTitle}</p>}
                {date && <p className="text-xs text-gray-500 mt-1">Date: {fmt(date)}</p>}
              </div>

              {qrProvider !== "none" && qrUrl && (
                <div className="flex flex-col items-center sm:items-end text-right">
                  <p className="text-[10px] text-gray-500 mb-1">Scan to verify</p>
                  <img src={qrUrl} alt="Certificate QR" width={qrSize} height={qrSize} className="inline-block" />
                  <p className="text-[11px] text-gray-700 font-medium mt-2">{resolvedId}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showPrint && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handlePrint}
              className="rounded px-3 py-1 text-xs border hover:bg-gray-50"
            >
              Print / Save as PDF
            </button>
          </div>
        )}

        <style jsx global>{`
          @page {
            size: 297mm 210mm;
            margin: 10mm;
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .kds-cert-print-root,
            .kds-cert-print-root * {
              visibility: visible;
            }
            .kds-cert-print-root {
              position: relative;
              width: auto;
              max-width: none;
              height: auto;
              margin: 0 auto;
              border-radius: 0;
              box-shadow: none !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

SimpleCertificate.displayName = "SimpleCertificate";
export default SimpleCertificate;

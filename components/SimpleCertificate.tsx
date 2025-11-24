import React, { forwardRef, useMemo, useRef } from "react";

/**
 * SimpleCertificate (signature fixed + balanced layout)
 * - QR and Signature truly side-by-side
 * - Larger recipient space and typography
 * - US Letter (8.5x11 portrait)
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
  onViewFull?: () => void;
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
    onViewFull,
  },
    ref
  ) => {
    const localRef = useRef<HTMLDivElement | null>(null);
    const setRefs = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

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

    const buildWindowHtml = (content: string, autoPrint: boolean) => `
        <html>
          <head>
            <title>Certificate</title>
            <style>
              @page { size: 210mm 297mm; margin: 10mm; }
              html, body { margin: 0; padding: 0; background: #fff; }
              .cert-print-wrapper { width: 210mm; margin: 0 auto; }
              * { box-sizing: border-box; }
            </style>
          </head>
          <body>
            <div class="cert-print-wrapper">${content}</div>
            ${autoPrint ? "<script>window.onload = function(){ window.print(); }</script>" : ""}
          </body>
        </html>
      `;

    const openCertificateWindow = ({ autoPrint }: { autoPrint: boolean }) => {
      if (typeof window === "undefined") return;
      const node = localRef.current;
      if (!node) return;
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) return;
      const html = node.outerHTML;
      w.document.write(buildWindowHtml(html, autoPrint));
      w.document.close();
      w.focus();
    };

    const handlePrint = () => openCertificateWindow({ autoPrint: true });
    const handleViewFull = () => {
      if (onViewFull) onViewFull();
      else openCertificateWindow({ autoPrint: false });
    };

    return (
      <div
        ref={setRefs}
        className={`mx-auto w-full bg-white print:shadow-none shadow relative ${className}`}
        style={{
          border: `6px solid ${accent}`,
          width: "210mm",
          maxWidth: "100%",
        }}
      >
        {showPrint && (
          <button
            onClick={handlePrint}
            className="absolute right-3 top-3 rounded px-3 py-1 text-xs border hover:bg-gray-50 print:hidden"
          >
            Print / Save as PDF
          </button>
        )}
        {showPrint && (
          <button
            onClick={handleViewFull}
            aria-label="view-full-cert"
            className="absolute right-3 top-12 rounded px-3 py-1 text-xs border hover:bg-gray-50 print:hidden"
          >
            View full certificate
          </button>
        )}

        <div className="p-10 sm:p-16">
          {/* Header */}
          <div className="flex items-center justify-between gap-6">
            <img src={panavestLogo} alt="PanAvest" className="h-16 w-auto" />
            <div className="text-center grow">
              <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: accent }}>
                Certificate of Completion
              </p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-serif font-bold">
                PanAvest Knowledge Development Series
              </h1>
            </div>
            <img src={kdsLogo} alt="KDS" className="h-16 w-auto" />
          </div>

          <div className="my-8 h-px" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

          {/* Recipient & Course */}
          <div className="text-center py-14">
            <p className="text-sm text-gray-600">This certifies that</p>
            <div className="mt-6 text-5xl sm:text-7xl font-serif font-bold" data-testid="recipient">
              {recipient}
            </div>
            <p className="mt-6 text-sm text-gray-600">has successfully completed</p>
            <div className="mt-3 text-2xl sm:text-3xl italic" data-testid="course">
              {course}
            </div>
            {blurb && (
              <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-gray-700" data-testid="blurb">
                {blurb}
              </p>
            )}
          </div>

          {/* Signature + QR side-by-side */}
          <div className="mt-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10">
            {/* Signature */}
            <div className="flex flex-col items-start">
              <img
                src={resolvedSignature}
                alt="Prof. Douglas Boateng signature"
                className="h-20 w-auto object-contain"
                decoding="async"
                loading="eager"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = SVG_PLACEHOLDER;
                }}
              />
              <div className="mt-3 h-px bg-gray-400 w-56" />
              <p className="mt-2 font-medium text-gray-900">{signerName}</p>
              {signerTitle && <p className="text-xs text-gray-600">{signerTitle}</p>}
              {date && <p className="text-xs text-gray-500 mt-1">Date: {fmt(date)}</p>}
            </div>

            {/* QR */}
            {qrProvider !== "none" && qrUrl && (
              <div className="flex flex-col items-center sm:items-end text-right">
                <p className="text-[10px] text-gray-500 mb-1">Scan to verify</p>
                <img src={qrUrl} alt="Certificate QR" width={qrSize} height={qrSize} className="inline-block" />
                <p className="text-[11px] text-gray-700 font-medium mt-2">{resolvedId}</p>
              </div>
            )}
          </div>
        </div>

        <style>{`@media print { @page { size: 8.5in 11in; margin: 0.5in; } html, body { background: white !important; } }`}</style>
      </div>
    );
  }
);

SimpleCertificate.displayName = "SimpleCertificate";
export default SimpleCertificate;

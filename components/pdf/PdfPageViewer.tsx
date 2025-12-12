"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
};

type PdfJsAPI<TDoc> = {
  getDocument: (params: { url: string }) => { promise: Promise<TDoc> };
  GlobalWorkerOptions: { workerSrc: string };
};

type Props = {
  url: string;
  className?: string;
  startPage?: number;
};

const workerSrc = "/vendor/pdf.worker.min.mjs";

export default function PdfPageViewer({ url, className = "", startPage = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<PdfDoc | null>(null);
  const [page, setPage] = useState(startPage);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastHeight, setLastHeight] = useState<number>(320); // stabilize layout between renders
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const renderingRef = useRef(false);

  // Configure worker once
  useEffect(() => {
    try {
      (pdfjs as unknown as PdfJsAPI<PdfDoc>).GlobalWorkerOptions.workerSrc = workerSrc;
    } catch {
      /* ignore */
    }
  }, []);

  // Load document when URL changes
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    setPage(startPage);

    const load = async () => {
      try {
        const api = pdfjs as unknown as PdfJsAPI<PdfDoc>;
        const task = api.getDocument({ url });
        const doc = await task.promise;
        if (cancelled) return;
        pdfRef.current = doc;
        setPageCount(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load PDF";
        setError(msg);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      pdfRef.current = null;
    };
  }, [url, startPage]);

  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => (pageCount ?? 0) > page, [page, pageCount]);

  useEffect(() => {
    if (pageCount && page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  // Core render routine
  const renderPage = useCallback(
    async (pageNumber: number) => {
      const doc = pdfRef.current;
      const canvas = canvasRef.current;
      const wrapper = containerRef.current;
      if (!doc || !canvas || !wrapper) return;
      renderingRef.current = true;
      setLoading(true);

      try {
        const pdfPage = await doc.getPage(pageNumber);
        const containerWidth = wrapper.clientWidth || 1;
        const viewport = pdfPage.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaled = pdfPage.getViewport({ scale });

        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not ready");

        canvas.width = Math.floor(scaled.width * dpr);
        canvas.height = Math.floor(scaled.height * dpr);
        canvas.style.width = `${scaled.width}px`;
        canvas.style.height = `${scaled.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        await new Promise<void>((resolve, reject) => {
          requestAnimationFrame(() => {
            pdfPage
              .render({ canvasContext: ctx, viewport: scaled })
              .promise.then(() => resolve())
              .catch(reject);
          });
        });

        setLastHeight(Math.max(200, Math.round(scaled.height)));
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Render failed";
        setError(msg);
      } finally {
        renderingRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  // Render when page or doc ready
  useEffect(() => {
    if (!pdfRef.current || !pageCount) return;
    void renderPage(page);
  }, [page, pageCount, renderPage]);

  // Resize observer to re-render on width change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    resizeObserverRef.current?.disconnect();
    const ro = new ResizeObserver(() => {
      if (renderingRef.current) return;
      void renderPage(page);
    });
    resizeObserverRef.current = ro;
    ro.observe(el);
    return () => ro.disconnect();
  }, [page, renderPage]);

  // Prefetch next page (lightweight getPage)
  useEffect(() => {
    const doc = pdfRef.current;
    if (!doc || !canNext) return;
    void doc.getPage(page + 1).catch(() => null);
  }, [page, canNext]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" && canPrev) {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (key === "arrowright" && canNext) {
        e.preventDefault();
        setPage((p) => p + 1);
      }
    },
    [canPrev, canNext],
  );

  return (
    <div
      ref={containerRef}
      className={`rounded-lg border border-[color:var(--color-light)] bg-white p-3 ${className}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-label="PDF viewer"
    >
      <div className="flex items-center justify-between gap-3 mb-2 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canPrev && setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            className={`rounded-md border px-2 py-1 ${canPrev ? "hover:bg-[color:var(--color-light)]/50" : "opacity-50 cursor-not-allowed"}`}
            aria-label="Previous page"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => canNext && setPage((p) => p + 1)}
            disabled={!canNext}
            className={`rounded-md border px-2 py-1 ${canNext ? "hover:bg-[color:var(--color-light)]/50" : "opacity-50 cursor-not-allowed"}`}
            aria-label="Next page"
          >
            →
          </button>
          <span className="text-xs text-muted">
            Page {pageCount ? Math.min(page, pageCount) : page} of {pageCount ?? "…"}
          </span>
        </div>
        {loading && <span className="text-[11px] text-muted">Loading…</span>}
      </div>

      <div className="relative w-full">
        <div style={{ minHeight: `${lastHeight}px` }} className="w-full">
          <canvas ref={canvasRef} className="w-full h-auto block" />
        </div>
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-700 bg-white/80">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

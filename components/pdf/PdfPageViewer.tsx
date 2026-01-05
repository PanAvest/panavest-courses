"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

// pdfjs uses Promise.withResolvers in newer builds; polyfill for runtimes that lack it.
if (typeof Promise !== "undefined" && !(Promise as unknown as { withResolvers?: unknown }).withResolvers) {
  (Promise as unknown as { withResolvers?: <T>() => { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void } }).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => RenderTask;
};
type RenderTask = { promise: Promise<void>; cancel: () => void };

type PdfJsAPI<TDoc> = {
  getDocument: (params: { url: string }) => { promise: Promise<TDoc> };
  GlobalWorkerOptions: { workerSrc: string };
};

type Status = "idle" | "loading" | "rendering" | "error";

type Props = {
  url: string;
  className?: string;
  startPage?: number;
};

const workerSrc = "/vendor/pdf.worker.min.mjs";
let workerSet = false;

export default function PdfPageViewer({ url, className = "", startPage = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PdfDoc | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const containerWidthRef = useRef<number>(0);

  const [page, setPage] = useState(Math.max(1, startPage));
  const [numPages, setNumPages] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);
  const [loadSeq, setLoadSeq] = useState(0); // for retry
  const [longLoad, setLongLoad] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Configure worker once
  useEffect(() => {
    if (workerSet) return;
    try {
      (pdfjs as unknown as PdfJsAPI<PdfDoc>).GlobalWorkerOptions.workerSrc = workerSrc;
      workerSet = true;
    } catch {
      /* ignore */
    }
  }, []);

  // Load document once per URL (or retry)
  useEffect(() => {
    let cancelled = false;
    const api = pdfjs as unknown as PdfJsAPI<PdfDoc>;
    setStatus("loading");
    setErrorMsg(null);
    setNumPages(null);
    setPage(Math.max(1, startPage));
    setLongLoad(false);

    const longTimer = setTimeout(() => {
      if (!cancelled) setLongLoad(true);
    }, 12000);

    const load = async () => {
      try {
        const task = api.getDocument({ url });
        const doc = await task.promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setStatus("rendering");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load PDF";
        setErrorMsg(msg);
        setStatus("error");
      } finally {
        clearTimeout(longTimer);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(longTimer);
      pdfDocRef.current = null;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [url, startPage, loadSeq]);

  const canPrev = page > 1;
  const canNext = (numPages ?? 0) > page;

  // Measure container with ResizeObserver, throttled via rAF and threshold
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    resizeObsRef.current?.disconnect();

    const updateWidth = () => {
      const w = Math.max(0, el.clientWidth);
      if (Math.abs(w - containerWidthRef.current) > 4) {
        containerWidthRef.current = w;
        setMeasuredWidth(w);
      }
    };

    updateWidth();

    const ro = new ResizeObserver(() => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(updateWidth);
    });
    resizeObsRef.current = ro;
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
    };
  }, []);

  const renderPage = useCallback(
    async (pageNumber: number) => {
      const doc = pdfDocRef.current;
      const canvas = canvasRef.current;
      const wrapper = containerRef.current;
      if (!doc || !canvas || !wrapper) return;
      const width = measuredWidth || wrapper.clientWidth || 1;

      renderTaskRef.current?.cancel();
      const pdfPage = await doc.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 1 });
      const scale = width / Math.max(1, viewport.width);
      const scaled = pdfPage.getViewport({ scale });

      // Render at device pixel ratio for crisp text, capped to avoid runaway memory.
      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(scaled.width * dpr);
      canvas.height = Math.floor(scaled.height * dpr);
      // CSS size stays locked to container width
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      setStatus("rendering");
      const task = pdfPage.render({ canvasContext: ctx, viewport: scaled });
      renderTaskRef.current = task;

      try {
        await task.promise;
        setErrorMsg(null);
        setStatus("idle");
        // Prefetch next page object (no render) for snappier nav
        if (doc && pageNumber < (doc.numPages || 0)) {
          void doc.getPage(pageNumber + 1).catch(() => null);
        }
      } catch (err) {
        if ((err as { name?: string }).name === "RenderingCancelled") return;
        const msg = err instanceof Error ? err.message : "Render failed";
        setErrorMsg(msg);
        setStatus("error");
      }
    },
    [measuredWidth],
  );

  // Render current page when ready or width changes
  useEffect(() => {
    if (!pdfDocRef.current || !numPages) return;
    void renderPage(Math.min(page, numPages));
  }, [page, numPages, renderPage, measuredWidth]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const key = e.key.toLowerCase();
      if (key === "arrowleft" && canPrev) {
        e.preventDefault();
        e.stopPropagation();
        setPage((p) => Math.max(1, p - 1));
      } else if (key === "arrowright" && canNext) {
        e.preventDefault();
        e.stopPropagation();
        setPage((p) => p + 1);
      }
    },
    [canPrev, canNext],
  );

  const retry = () => {
    setLoadSeq((s) => s + 1);
  };

  const minHeightStyle = { minHeight: "clamp(260px, 55vw, 520px)" };

  const toggleFullscreen = async () => {
    const node = fullRef.current;
    if (!node) return;
    try {
      if (!document.fullscreenElement) {
        await node.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const handler = () => {
      const node = fullRef.current;
      setIsFullscreen(!!node && document.fullscreenElement === node);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div
      ref={fullRef}
      className={`w-full max-w-full rounded-lg border border-[color:var(--color-light)] bg-white p-3 ${className}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-label="PDF viewer"
    >
      <div className="flex items-center justify-between gap-3 mb-2 text-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canPrev) setPage((p) => Math.max(1, p - 1));
            }}
            disabled={!canPrev}
            className={`rounded-md border px-2 py-1 ${canPrev ? "hover:bg-[color:var(--color-light)]/50" : "opacity-50 cursor-not-allowed"}`}
            aria-label="Previous PDF page"
          >
            ←
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canNext) setPage((p) => p + 1);
            }}
            disabled={!canNext}
            className={`rounded-md border px-2 py-1 ${canNext ? "hover:bg-[color:var(--color-light)]/50" : "opacity-50 cursor-not-allowed"}`}
            aria-label="Next PDF page"
          >
            →
          </button>
          <span className="text-xs text-muted">
            Page {numPages ? Math.min(page, numPages) : page} of {numPages ?? "…"}
          </span>
        </div>
        <div className="text-[11px] text-muted">
          {status === "loading" && "Loading PDF…"}
          {status === "rendering" && "Rendering…"}
          {longLoad && status === "loading" && " Still loading…"}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-3 text-xs md:text-sm">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-md border px-3 py-1 hover:bg-[color:var(--color-light)]/50"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={minHeightStyle}
      >
        <canvas ref={canvasRef} className="block w-full h-auto" />
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-red-700 bg-white/85">
            <div>{errorMsg}</div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                retry();
              }}
              className="rounded-md border px-3 py-1 text-xs hover:bg-[color:var(--color-light)]/40"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

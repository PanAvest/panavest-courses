"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PdfHttpHeaders = Record<string, string>;
interface PdfLoadingTask<TDoc> { promise: Promise<TDoc>; }
interface PdfJsAPI<TDoc> {
  getDocument: (params: {
    data?: ArrayBuffer | Uint8Array;
    url?: string;
    withCredentials?: boolean;
    httpHeaders?: PdfHttpHeaders;
  }) => PdfLoadingTask<TDoc>;
  GlobalWorkerOptions: { workerSrc: string };
}
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };

type Ebook = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  sample_url?: string | null;
  price_cents: number;
  published: boolean;
  free_for_logged_in?: boolean;
};

type OwnershipState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "owner" }
  | { kind: "not_owner" };

type ReaderMode = "scroll" | "flip";
type FlipDirection = "next" | "prev";

type FlipPageFrame = {
  page: number;
  src: string;
  width: number;
  height: number;
};

type FlipSpread = {
  startPage: number;
  endPage: number;
  left: FlipPageFrame | null;
  right: FlipPageFrame | null;
  pageWidth: number;
  pageHeight: number;
  gap: number;
  width: number;
  height: number;
};

type FlipMetrics = {
  pageWidth: number;
  pageHeight: number;
  gap: number;
  stageWidth: number;
  stageHeight: number;
};

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;
const FLIP_ANIMATION_MS = 560;
const MOBILE_SCROLL_ACTIVE_PAGES = 3;
const DESKTOP_SCROLL_ACTIVE_PAGES = 5;

const clampZoom = (value: number) =>
  Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 100) / 100));

const getTouchDistance = (first: Touch, second: Touch) =>
  Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

export default function EbookDetailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [own, setOwn] = useState<OwnershipState>({ kind: "loading" });
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [buying, setBuying] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const [pdfReady, setPdfReady] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readerMode, setReaderMode] = useState<ReaderMode>("scroll");
  const [rendering, setRendering] = useState(false);
  const [flipLoading, setFlipLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pinchPreviewScale, setPinchPreviewScale] = useState(1);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [flipSpreadStart, setFlipSpreadStart] = useState(1);
  const [flipSpread, setFlipSpread] = useState<FlipSpread | null>(null);
  const [outgoingFlipSpread, setOutgoingFlipSpread] = useState<FlipSpread | null>(null);
  const [incomingFlipSpread, setIncomingFlipSpread] = useState<FlipSpread | null>(null);
  const [flipDirection, setFlipDirection] = useState<FlipDirection | null>(null);
  const [flipAnimating, setFlipAnimating] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const readerWrapRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const flipViewportRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PdfDoc | null>(null);
  const pdfApiRef = useRef<PdfJsAPI<PdfDoc> | null>(null);
  const pageAspectRef = useRef(1.4142);
  const lastContainerWidthRef = useRef(0);
  const renderingRef = useRef(false);
  const flipAnimatingRef = useRef(false);
  const flipTimeoutRef = useRef<number | null>(null);
  const zoomRef = useRef(zoom);
  const currentPageRef = useRef(currentPage);
  const flipSpreadStartRef = useRef(flipSpreadStart);
  const scrollRenderSeqRef = useRef(0);
  const scrollSyncRunningRef = useRef(false);
  const scrollSyncPendingRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);
  const hasRestoredFlipRef = useRef(false);
  const pinchStateRef = useRef({
    active: false,
    startDistance: 0,
    startZoom: 1,
    targetZoom: 1,
  });
  const swipeStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
  });
  const dragPanStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  const dashboardHref = "/dashboard";

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    flipSpreadStartRef.current = flipSpreadStart;
  }, [flipSpreadStart]);

  useEffect(() => {
    const preventAll = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "u", "c", "x", "a"].includes(k)) preventAll(e);
    };
    const capture: AddEventListenerOptions = { capture: true };
    document.addEventListener("contextmenu", preventAll, capture);
    document.addEventListener("copy", preventAll, capture);
    document.addEventListener("cut", preventAll, capture);
    document.addEventListener("paste", preventAll, capture);
    document.addEventListener("keydown", onKey, capture);
    window.addEventListener("beforeprint", preventAll, capture);
    return () => {
      document.removeEventListener("contextmenu", preventAll, capture);
      document.removeEventListener("copy", preventAll, capture);
      document.removeEventListener("cut", preventAll, capture);
      document.removeEventListener("paste", preventAll, capture);
      document.removeEventListener("keydown", onKey, capture);
      window.removeEventListener("beforeprint", preventAll, capture);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import("pdfjs-dist")) as unknown as PdfJsAPI<PdfDoc>;
        mod.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
        if (cancelled) return;
        pdfApiRef.current = mod;
        setPdfReady(true);
      } catch {
        if (cancelled) return;
        pdfApiRef.current = null;
        setPdfReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId("");
        setEmail("");
        setOwn({ kind: "signed_out" });
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
    })();
  }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const response = await fetch(`/api/ebooks/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || response.statusText);
        setEbook(data as Ebook);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [slug]);

  useEffect(() => {
    pdfDocRef.current = null;
    renderingRef.current = false;
    flipAnimatingRef.current = false;
    dragPanStateRef.current.active = false;
    if (flipTimeoutRef.current) {
      window.clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = null;
    }
    setShowReader(false);
    setIsFullscreen(false);
    setReaderMode("scroll");
    setRenderError(null);
    setZoom(1);
    setPinchPreviewScale(1);
    setIsDraggingPan(false);
    setPageCount(0);
    setCurrentPage(1);
    setFlipSpreadStart(1);
    setFlipSpread(null);
    setOutgoingFlipSpread(null);
    setIncomingFlipSpread(null);
    setFlipDirection(null);
    setFlipAnimating(false);
    setBookmarks([]);
    setShowBookmarks(false);
    hasRestoredScrollRef.current = false;
    hasRestoredFlipRef.current = false;
  }, [ebook?.id]);

  useEffect(() => {
    (async () => {
      if (!ebook?.id) {
        setOwn({ kind: "loading" });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOwn({ kind: "signed_out" });
        return;
      }
      if (ebook.free_for_logged_in) {
        setOwn({ kind: "owner" });
        return;
      }
      const { data, error } = await supabase
        .from("ebook_purchases")
        .select("status")
        .eq("user_id", user.id)
        .eq("ebook_id", ebook.id)
        .maybeSingle();
      if (error) {
        setOwn({ kind: "not_owner" });
        return;
      }
      setOwn(data?.status === "paid" ? { kind: "owner" } : { kind: "not_owner" });
    })();
  }, [ebook?.id, ebook?.free_for_logged_in]);

  useEffect(() => {
    const ref = search.get("reference") || search.get("ref") || null;
    if (!ref || !ebook?.id || !userId) return;

    let stopped = false;
    let tries = 0;
    setVerifying(ref);

    (async () => {
      try {
        await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(ref)}`, { method: "GET" })
          .then((response) => response.json())
          .catch(() => null);
      } catch {}

      while (!stopped && tries < 15) {
        tries += 1;
        try {
          const { data, error } = await supabase
            .from("ebook_purchases")
            .select("status")
            .eq("user_id", userId)
            .eq("ebook_id", ebook.id)
            .maybeSingle();
          if (!error && data?.status === "paid") {
            setOwn({ kind: "owner" });
            setVerifying(null);
            router.replace(`/ebooks/${encodeURIComponent(slug)}`);
            return;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      setVerifying(null);
    })();

    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, ebook?.id, userId, slug]);

  const price = useMemo(() => {
    if (!ebook) return "";
    if (ebook.free_for_logged_in) return "Free with login";
    return `GH₵ ${(ebook.price_cents / 100).toFixed(2)}`;
  }, [ebook]);

  const normalizeFlipSpreadStart = useCallback((page: number) => {
    if (pageCount <= 1) return 1;
    const maxStart = pageCount % 2 === 0 ? pageCount - 1 : pageCount;
    const oddPage = page <= 1 ? 1 : (page % 2 === 0 ? page - 1 : page);
    return Math.max(1, Math.min(maxStart, oddPage));
  }, [pageCount]);

  const currentScrollHost = useCallback(() => {
    return readerMode === "flip" ? flipViewportRef.current : scrollRef.current;
  }, [readerMode]);

  const getScrollPageWidth = useCallback(() => {
    const scrollerWidth = scrollRef.current?.clientWidth ?? 0;
    const safeWidth = Math.max(260, scrollerWidth - 32);
    return Math.max(220, Math.floor(safeWidth * zoom));
  }, [zoom]);

  const getScrollActivePageCount = useCallback(() => {
    if (typeof window === "undefined") return DESKTOP_SCROLL_ACTIVE_PAGES;
    return window.innerWidth < 768 ? MOBILE_SCROLL_ACTIVE_PAGES : DESKTOP_SCROLL_ACTIVE_PAGES;
  }, []);

  const getFlipMetrics = useCallback((): FlipMetrics => {
    const viewportWidth = flipViewportRef.current?.clientWidth
      ?? scrollRef.current?.clientWidth
      ?? (typeof window !== "undefined" ? window.innerWidth : 0);
    const viewportHeight = flipViewportRef.current?.clientHeight
      ?? scrollRef.current?.clientHeight
      ?? (typeof window !== "undefined" ? window.innerHeight : 0);
    const aspectRatio = Math.max(1.2, Math.min(1.8, pageAspectRef.current || 1.4142));
    const safeWidth = Math.max(320, viewportWidth - (isFullscreen ? 48 : 56));
    const safeHeight = Math.max(320, viewportHeight - (isFullscreen ? 56 : 48));
    const widthFit = (Math.min(safeWidth, isFullscreen ? 1360 : 1100) - 28) / 2;
    const heightFit = safeHeight / aspectRatio;
    const basePageWidth = Math.max(150, Math.floor(Math.min(widthFit, heightFit)));
    const pageWidth = Math.max(150, Math.floor(basePageWidth * zoom));
    const gap = Math.max(14, Math.min(30, Math.round(pageWidth * 0.03)));
    const pageHeight = Math.max(220, Math.round(pageWidth * aspectRatio));

    return {
      pageWidth,
      pageHeight,
      gap,
      stageWidth: pageWidth * 2 + gap,
      stageHeight: pageHeight,
    };
  }, [isFullscreen, zoom]);

  const getFlipPageWidth = useCallback(() => {
    return getFlipMetrics().pageWidth;
  }, [getFlipMetrics]);

  const clearFlipTransition = useCallback((dropSpread = false) => {
    if (flipTimeoutRef.current) {
      window.clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = null;
    }
    flipAnimatingRef.current = false;
    setFlipAnimating(false);
    setOutgoingFlipSpread(null);
    setIncomingFlipSpread(null);
    setFlipDirection(null);
    if (dropSpread) {
      setFlipSpread(null);
    }
  }, []);

  const ensurePdfDoc = useCallback(async (): Promise<PdfDoc | null> => {
    if (pdfDocRef.current) {
      setPageCount(pdfDocRef.current.numPages);
      return pdfDocRef.current;
    }
    if (!ebook?.id) return null;
    const pdfApi = pdfApiRef.current;
    if (!pdfApi) {
      setRenderError("PDF engine unavailable. Please refresh and try again.");
      return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      setRenderError("You must be signed in to read this e-book.");
      return null;
    }

    const response = await fetch(`/api/ebooks/secure-pdf?ebookId=${encodeURIComponent(ebook.id)}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      setRenderError("Session expired or not signed in. Please sign in again.");
      return null;
    }
    if (response.status === 403) {
      setRenderError("This e-book is locked for your account.");
      return null;
    }
    if (!response.ok) {
      setRenderError(`Secure PDF request failed: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const loadingTask = pdfApi.getDocument({ data: buffer });
    const doc = await loadingTask.promise;
    pdfDocRef.current = doc;
    setPageCount(doc.numPages);
    return doc;
  }, [ebook?.id]);

  const renderPdfPageToCanvas = useCallback(async (pageNumber: number, cssWidth: number, canvas: HTMLCanvasElement) => {
    const doc = await ensurePdfDoc();
    if (!doc) throw new Error("PDF not available");

    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const aspectRatio = base.height / base.width;
    pageAspectRef.current = aspectRatio;
    const targetWidth = Math.max(220, Math.floor(cssWidth));
    const isCompactViewport = window.innerWidth < 768;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1.35 : 1.8);
    const viewport = page.getViewport({ scale: (targetWidth * pixelRatio) / base.width });
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${Math.floor(targetWidth * aspectRatio)}px`;
    canvas.style.display = "block";
    canvas.style.borderRadius = "18px";
    canvas.style.background = "#ffffff";
    canvas.style.boxShadow = "0 18px 40px rgba(15, 23, 42, 0.10)";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }, [ensurePdfDoc]);

  const releaseScrollCanvas = useCallback((pageWrap: HTMLDivElement) => {
    const existing = pageWrap.querySelector<HTMLCanvasElement>("canvas[data-page]");
    if (existing) {
      existing.width = 0;
      existing.height = 0;
      existing.remove();
    }
    pageWrap.dataset.state = "idle";
    delete pageWrap.dataset.renderWidth;
  }, []);

  const syncVisibleScrollPages = useCallback(async () => {
    const pagesEl = pagesRef.current;
    const scroller = scrollRef.current;
    if (!pagesEl || !scroller || readerMode !== "scroll" || !showReader) return;

    if (scrollSyncRunningRef.current) {
      scrollSyncPendingRef.current = true;
      return;
    }

    scrollSyncRunningRef.current = true;

    try {
      do {
        scrollSyncPendingRef.current = false;

        const wrappers = Array.from(pagesEl.children) as HTMLDivElement[];
        if (wrappers.length === 0) break;

        const pageWidth = getScrollPageWidth();
        const placeholderHeight = Math.max(280, Math.floor(pageWidth * pageAspectRef.current));
        const scrollerRect = scroller.getBoundingClientRect();
        const probeLine = scrollerRect.top + scroller.clientHeight * 0.18;

        let bestPage = currentPageRef.current;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const pageWrap of wrappers) {
          pageWrap.style.minHeight = `${placeholderHeight}px`;
          pageWrap.style.height = `${placeholderHeight}px`;

          const rect = pageWrap.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const distance = Math.abs(center - probeLine);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPage = Number(pageWrap.dataset.page ?? "1");
          }
        }

        setCurrentPage((value) => (value === bestPage ? value : bestPage));

        const radius = Math.floor(getScrollActivePageCount() / 2);
        const activePages = new Set<number>();
        for (
          let pageNumber = Math.max(1, bestPage - radius);
          pageNumber <= Math.min(wrappers.length, bestPage + radius);
          pageNumber += 1
        ) {
          activePages.add(pageNumber);
        }

        for (const pageWrap of wrappers) {
          const pageNumber = Number(pageWrap.dataset.page ?? "0");
          if (!activePages.has(pageNumber)) {
            releaseScrollCanvas(pageWrap);
          }
        }

        const seq = ++scrollRenderSeqRef.current;
        const orderedPages = Array.from(activePages).sort(
          (a, b) => Math.abs(a - bestPage) - Math.abs(b - bestPage),
        );

        for (const pageNumber of orderedPages) {
          if (scrollRenderSeqRef.current !== seq) break;

          const pageWrap = pagesEl.querySelector<HTMLDivElement>(`[data-page="${pageNumber}"]`);
          if (!pageWrap) continue;

          const renderedWidth = Number(pageWrap.dataset.renderWidth ?? "0");
          const renderState = pageWrap.dataset.state ?? "idle";
          const existingCanvas = pageWrap.querySelector<HTMLCanvasElement>("canvas[data-page]");
          const widthMatches = Math.abs(renderedWidth - pageWidth) < 2;

          if (renderState === "rendered" && existingCanvas && widthMatches) continue;
          if (renderState === "rendering") continue;

          releaseScrollCanvas(pageWrap);
          pageWrap.dataset.state = "rendering";

          const canvas = document.createElement("canvas");
          canvas.dataset.page = String(pageNumber);
          pageWrap.appendChild(canvas);

          try {
            await renderPdfPageToCanvas(pageNumber, pageWidth, canvas);
            if (scrollRenderSeqRef.current !== seq || !activePages.has(pageNumber)) {
              releaseScrollCanvas(pageWrap);
              continue;
            }
            pageWrap.dataset.state = "rendered";
            pageWrap.dataset.renderWidth = String(pageWidth);
            const renderedHeight = Number.parseFloat(canvas.style.height || "0");
            if (Number.isFinite(renderedHeight) && renderedHeight > 0) {
              pageWrap.style.minHeight = `${renderedHeight}px`;
              pageWrap.style.height = `${renderedHeight}px`;
            }
          } catch (e) {
            releaseScrollCanvas(pageWrap);
            setRenderError((e as Error).message || "Failed to load PDF");
          }
        }
      } while (scrollSyncPendingRef.current);
    } finally {
      scrollSyncRunningRef.current = false;
    }
  }, [
    getScrollActivePageCount,
    getScrollPageWidth,
    readerMode,
    releaseScrollCanvas,
    renderPdfPageToCanvas,
    showReader,
  ]);

  const renderFlipPageFrame = useCallback(async (pageNumber: number, pageWidth: number): Promise<FlipPageFrame | null> => {
    const doc = await ensurePdfDoc();
    if (!doc || pageNumber < 1 || pageNumber > doc.numPages) return null;

    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    pageAspectRef.current = base.height / base.width;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: (pageWidth * pixelRatio) / base.width });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    return {
      page: pageNumber,
      src: canvas.toDataURL("image/png"),
      width: pageWidth,
      height: Math.floor(pageWidth * (base.height / base.width)),
    };
  }, [ensurePdfDoc]);

  const renderFlipSpreadForStart = useCallback(async (startPage: number): Promise<FlipSpread> => {
    const doc = await ensurePdfDoc();
    if (!doc) throw new Error("PDF not available");

    const safeStart = normalizeFlipSpreadStart(startPage);
    const metrics = getFlipMetrics();
    const pageWidth = metrics.pageWidth;
    const left = await renderFlipPageFrame(safeStart, pageWidth);
    const right = safeStart + 1 <= doc.numPages
      ? await renderFlipPageFrame(safeStart + 1, pageWidth)
      : null;
    const gap = metrics.gap;
    const pageHeight = Math.max(left?.height ?? 0, right?.height ?? 0, metrics.pageHeight);

    return {
      startPage: safeStart,
      endPage: right?.page ?? safeStart,
      left,
      right,
      pageWidth,
      pageHeight,
      gap,
      width: metrics.stageWidth,
      height: metrics.stageHeight,
    };
  }, [ensurePdfDoc, getFlipMetrics, normalizeFlipSpreadStart, renderFlipPageFrame]);

  const renderScrollPdf = useCallback(async () => {
    if (renderingRef.current) return;
    const pagesEl = pagesRef.current;
    const scroller = scrollRef.current;
    if (!pagesEl || !scroller) return;

    renderingRef.current = true;
    setRendering(true);
    setRenderError(null);

    const previousVerticalRange = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
    const previousHorizontalRange = Math.max(scroller.scrollWidth - scroller.clientWidth, 0);
    const previousTopRatio = previousVerticalRange > 0 ? scroller.scrollTop / previousVerticalRange : 0;
    const previousLeftRatio = previousHorizontalRange > 0 ? scroller.scrollLeft / previousHorizontalRange : 0;

    try {
      const doc = await ensurePdfDoc();
      if (!doc) throw new Error("PDF not available");

      const pageWidth = getScrollPageWidth();
      lastContainerWidthRef.current = scroller.clientWidth;
      pagesEl.innerHTML = "";
      pagesEl.style.width = `${pageWidth}px`;

      const fragment = document.createDocumentFragment();
      const placeholderHeight = Math.max(280, Math.floor(pageWidth * pageAspectRef.current));
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const pageWrap = document.createElement("div");
        pageWrap.style.display = "flex";
        pageWrap.style.justifyContent = "center";
        pageWrap.style.minHeight = `${placeholderHeight}px`;
        pageWrap.style.height = `${placeholderHeight}px`;
        pageWrap.style.contain = "layout paint";
        pageWrap.dataset.page = String(pageNumber);
        pageWrap.dataset.state = "idle";
        fragment.appendChild(pageWrap);
      }
      pagesEl.appendChild(fragment);

      const nextVerticalRange = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
      const nextHorizontalRange = Math.max(scroller.scrollWidth - scroller.clientWidth, 0);

      if (!hasRestoredScrollRef.current) {
        // First render for this ebook — jump to last-read page if saved
        hasRestoredScrollRef.current = true;
        const savedKey = `pv.ebook.lastpage.${userId || "anon"}.${ebook?.id}`;
        const savedPage = parseInt(localStorage.getItem(savedKey) ?? "1", 10);
        if (savedPage > 1) {
          const target = pagesEl.querySelector<HTMLDivElement>(`[data-page="${savedPage}"]`);
          if (target) {
            scroller.scrollTop = (target as HTMLElement).offsetTop;
          }
        } else {
          scroller.scrollTop = nextVerticalRange > 0 ? previousTopRatio * nextVerticalRange : 0;
          scroller.scrollLeft = nextHorizontalRange > 0 ? previousLeftRatio * nextHorizontalRange : 0;
        }
      } else {
        scroller.scrollTop = nextVerticalRange > 0 ? previousTopRatio * nextVerticalRange : 0;
        scroller.scrollLeft = nextHorizontalRange > 0 ? previousLeftRatio * nextHorizontalRange : 0;
      }
      await syncVisibleScrollPages();
    } catch (e) {
      setRenderError((e as Error).message || "Failed to load PDF");
    } finally {
      setRendering(false);
      renderingRef.current = false;
    }
  }, [ebook?.id, ensurePdfDoc, getScrollPageWidth, syncVisibleScrollPages, userId]);

  const loadCurrentFlipSpread = useCallback(async (startPage: number) => {
    setFlipLoading(true);
    setRenderError(null);
    try {
      const spread = await renderFlipSpreadForStart(startPage);
      clearFlipTransition();
      setFlipSpread(spread);
      setFlipSpreadStart(spread.startPage);
      setCurrentPage(spread.startPage);
      setOutgoingFlipSpread(null);
      setIncomingFlipSpread(null);
      setFlipDirection(null);
      window.requestAnimationFrame(() => {
        const viewport = flipViewportRef.current;
        if (!viewport || zoomRef.current > 1.01) return;
        viewport.scrollTo({ left: 0, top: 0, behavior: "auto" });
      });
    } catch (e) {
      setRenderError((e as Error).message || "Failed to load page");
    } finally {
      setFlipLoading(false);
    }
  }, [clearFlipTransition, renderFlipSpreadForStart]);

  const changeZoom = useCallback((delta: number) => {
    setZoom((value) => clampZoom(value + delta));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  async function handleBuy() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`);
      return;
    }
    if (!ebook || !email) return;
    if (ebook.free_for_logged_in) {
      setOwn({ kind: "owner" });
      return;
    }

    setBuying(true);
    try {
      const amountMinor = Math.round(Number(ebook.price_cents));
      const response = await fetch("/api/payments/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amountMinor,
          meta: { kind: "ebook", user_id: user.id, ebook_id: ebook.id, slug: ebook.slug },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.authorization_url) {
        throw new Error(data?.error || "Failed to initialize payment.");
      }
      window.location.href = data.authorization_url;
    } catch (e) {
      setErr((e as Error).message || "Payment init failed");
      setBuying(false);
    }
  }

  const openReader = useCallback((fullscreen = false) => {
    if (own.kind !== "owner") return;
    setShowReader(true);
    setIsFullscreen(fullscreen);
    if (!fullscreen) {
      clearFlipTransition(true);
      setReaderMode("scroll");
    }
    window.requestAnimationFrame(() => {
      if (!fullscreen) {
        readerWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [clearFlipTransition, own.kind]);

  const activateFlipMode = useCallback(() => {
    if (!isFullscreen) return;
    const start = normalizeFlipSpreadStart(currentPageRef.current);
    clearFlipTransition(true);
    setFlipLoading(true);
    setFlipSpreadStart(start);
    setCurrentPage(start);
    setRenderError(null);
    setReaderMode("flip");
    window.requestAnimationFrame(() => {
      flipViewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "auto" });
    });
  }, [clearFlipTransition, isFullscreen, normalizeFlipSpreadStart]);

  const goToFlipSpread = useCallback(async (targetStart: number) => {
    if (!pageCount || flipAnimatingRef.current) return;
    const safeStart = normalizeFlipSpreadStart(targetStart);
    if (safeStart === flipSpreadStartRef.current) return;

    setRenderError(null);
    setFlipLoading(true);
    try {
      const nextSpread = await renderFlipSpreadForStart(safeStart);
      if (!flipSpread) {
        clearFlipTransition();
        setFlipSpread(nextSpread);
        setFlipSpreadStart(nextSpread.startPage);
        setCurrentPage(nextSpread.startPage);
        setFlipLoading(false);
        return;
      }

      const direction: FlipDirection = safeStart > flipSpreadStartRef.current ? "next" : "prev";
      flipAnimatingRef.current = true;
      setFlipDirection(direction);
      setOutgoingFlipSpread(flipSpread);
      setIncomingFlipSpread(nextSpread);
      window.requestAnimationFrame(() => setFlipAnimating(true));

      if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
      flipTimeoutRef.current = window.setTimeout(() => {
        setFlipAnimating(false);
        setOutgoingFlipSpread(null);
        setIncomingFlipSpread(null);
        setFlipDirection(null);
        setFlipSpread(nextSpread);
        setFlipSpreadStart(nextSpread.startPage);
        setCurrentPage(nextSpread.startPage);
        setFlipLoading(false);
        flipAnimatingRef.current = false;
      }, FLIP_ANIMATION_MS);
    } catch (e) {
      setRenderError((e as Error).message || "Failed to load pages");
      setFlipLoading(false);
      flipAnimatingRef.current = false;
      clearFlipTransition();
    }
  }, [clearFlipTransition, flipSpread, normalizeFlipSpreadStart, pageCount, renderFlipSpreadForStart]);

  useEffect(() => {
    if (!isFullscreen && readerMode === "flip") {
      clearFlipTransition(true);
      setReaderMode("scroll");
    }
  }, [clearFlipTransition, isFullscreen, readerMode]);

  /* ── Persist last-read page ── */
  useEffect(() => {
    if (!showReader || !ebook?.id) return;
    const key = `pv.ebook.lastpage.${userId || "anon"}.${ebook.id}`;
    localStorage.setItem(key, String(currentPage));
  }, [currentPage, ebook?.id, showReader, userId]);

  /* ── Load bookmarks for this ebook ── */
  useEffect(() => {
    if (!ebook?.id) return;
    const key = `pv.ebook.bookmarks.${userId || "anon"}.${ebook.id}`;
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]") as number[];
    setBookmarks(saved);
  }, [ebook?.id, userId]);

  useEffect(() => {
    if (!showReader || !pdfReady || !ebook?.id || readerMode !== "scroll") return;
    void renderScrollPdf();
  }, [ebook?.id, pdfReady, readerMode, renderScrollPdf, showReader]);

  useEffect(() => {
    if (!showReader || !pdfReady || !ebook?.id || readerMode !== "flip" || !isFullscreen) return;

    const expectedWidth = getFlipPageWidth();
    if (flipSpread && flipSpread.startPage === flipSpreadStart && Math.abs(flipSpread.pageWidth - expectedWidth) < 2) {
      return;
    }
    if (!flipAnimatingRef.current) {
      let startPage = flipSpreadStart;
      if (!hasRestoredFlipRef.current) {
        hasRestoredFlipRef.current = true;
        const savedKey = `pv.ebook.lastpage.${userId || "anon"}.${ebook.id}`;
        const savedPage = parseInt(localStorage.getItem(savedKey) ?? "1", 10);
        if (savedPage > 1) startPage = normalizeFlipSpreadStart(savedPage);
      }
      void loadCurrentFlipSpread(startPage);
    }
  }, [
    ebook?.id,
    flipSpread,
    flipSpreadStart,
    getFlipPageWidth,
    isFullscreen,
    loadCurrentFlipSpread,
    normalizeFlipSpreadStart,
    pdfReady,
    readerMode,
    showReader,
    userId,
  ]);

  useEffect(() => {
    if (!showReader || readerMode !== "scroll") return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    const ro = new ResizeObserver(() => {
      const width = scroller.clientWidth;
      if (width && width !== lastContainerWidthRef.current && pdfReady && ebook?.id) {
        lastContainerWidthRef.current = width;
        void renderScrollPdf();
      }
    });
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [ebook?.id, pdfReady, readerMode, renderScrollPdf, showReader]);

  useEffect(() => {
    if (!showReader || readerMode !== "flip" || !isFullscreen) return;
    const viewport = flipViewportRef.current;
    if (!viewport) return;

    const ro = new ResizeObserver(() => {
      if (!pdfReady || !ebook?.id || flipAnimatingRef.current) return;
      void loadCurrentFlipSpread(flipSpreadStartRef.current);
    });
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [ebook?.id, isFullscreen, loadCurrentFlipSpread, pdfReady, readerMode, showReader]);

  useEffect(() => {
    if (!showReader || readerMode !== "scroll") return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    let rafId = 0;
    const syncScrollWindow = () => {
      rafId = 0;
      void syncVisibleScrollPages();
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(syncScrollWindow);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    syncScrollWindow();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [readerMode, showReader, syncVisibleScrollPages]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!showReader) return;

      if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        changeZoom(ZOOM_STEP);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        changeZoom(-ZOOM_STEP);
        return;
      }

      if (readerMode === "flip" && isFullscreen && (e.key === "ArrowRight" || e.key === "PageDown")) {
        e.preventDefault();
        void goToFlipSpread(flipSpreadStartRef.current + 2);
        return;
      }

      if (readerMode === "flip" && isFullscreen && (e.key === "ArrowLeft" || e.key === "PageUp")) {
        e.preventDefault();
        void goToFlipSpread(flipSpreadStartRef.current - 2);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [changeZoom, goToFlipSpread, isFullscreen, readerMode, showReader]);

  useEffect(() => {
    if (!showReader || !isFullscreen) return;
    const target = currentScrollHost();
    if (!target) return;

    const commitPinch = () => {
      if (!pinchStateRef.current.active) return;
      pinchStateRef.current.active = false;
      setPinchPreviewScale(1);
      if (Math.abs(pinchStateRef.current.targetZoom - zoomRef.current) > 0.01) {
        setZoom(clampZoom(pinchStateRef.current.targetZoom));
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinchStateRef.current.active = true;
      pinchStateRef.current.startDistance = getTouchDistance(e.touches[0], e.touches[1]);
      pinchStateRef.current.startZoom = zoomRef.current;
      pinchStateRef.current.targetZoom = zoomRef.current;
      setPinchPreviewScale(1);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pinchStateRef.current.active || e.touches.length !== 2) return;
      e.preventDefault();
      const ratio = getTouchDistance(e.touches[0], e.touches[1]) / pinchStateRef.current.startDistance;
      const nextZoom = clampZoom(pinchStateRef.current.startZoom * ratio);
      pinchStateRef.current.targetZoom = nextZoom;
      setPinchPreviewScale(nextZoom / zoomRef.current);
    };

    const onTouchEnd = () => commitPinch();

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: false });
    target.addEventListener("touchend", onTouchEnd);
    target.addEventListener("touchcancel", onTouchEnd);
    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [currentScrollHost, isFullscreen, showReader]);

  useEffect(() => {
    if (!showReader || readerMode !== "flip" || !isFullscreen) return;
    const target = flipViewportRef.current;
    if (!target) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        swipeStateRef.current.active = false;
        return;
      }
      swipeStateRef.current.active = true;
      swipeStateRef.current.startX = e.touches[0].clientX;
      swipeStateRef.current.startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!swipeStateRef.current.active || pinchStateRef.current.active || e.changedTouches.length !== 1) return;

      const dx = e.changedTouches[0].clientX - swipeStateRef.current.startX;
      const dy = e.changedTouches[0].clientY - swipeStateRef.current.startY;
      swipeStateRef.current.active = false;

      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) {
        void goToFlipSpread(flipSpreadStartRef.current + 2);
      } else {
        void goToFlipSpread(flipSpreadStartRef.current - 2);
      }
    };

    const onTouchCancel = () => {
      swipeStateRef.current.active = false;
    };

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchend", onTouchEnd);
    target.addEventListener("touchcancel", onTouchCancel);
    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [goToFlipSpread, isFullscreen, readerMode, showReader]);

  useEffect(() => {
    if (!showReader) return;
    const target = currentScrollHost();
    if (!target) return;

    const endDrag = () => {
      if (!dragPanStateRef.current.active) return;
      dragPanStateRef.current.active = false;
      setIsDraggingPan(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0 || zoomRef.current <= 1.01) return;
      const interactive = (e.target as HTMLElement | null)?.closest("button,a");
      if (interactive) return;
      dragPanStateRef.current.active = true;
      dragPanStateRef.current.startX = e.clientX;
      dragPanStateRef.current.startY = e.clientY;
      dragPanStateRef.current.startScrollLeft = target.scrollLeft;
      dragPanStateRef.current.startScrollTop = target.scrollTop;
      setIsDraggingPan(true);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragPanStateRef.current.active || e.pointerType === "touch") return;
      target.scrollLeft = dragPanStateRef.current.startScrollLeft - (e.clientX - dragPanStateRef.current.startX);
      target.scrollTop = dragPanStateRef.current.startScrollTop - (e.clientY - dragPanStateRef.current.startY);
    };

    target.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      target.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      endDrag();
    };
  }, [currentScrollHost, showReader]);

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
    };
  }, []);

  function toggleBookmark(page: number) {
    if (!ebook?.id) return;
    const key = `pv.ebook.bookmarks.${userId || "anon"}.${ebook.id}`;
    setBookmarks((prev) => {
      const next = prev.includes(page)
        ? prev.filter((p) => p !== page)
        : [...prev, page].sort((a, b) => a - b);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }

  function goToPage(page: number) {
    setShowBookmarks(false);
    if (readerMode === "flip" && isFullscreen) {
      void goToFlipSpread(normalizeFlipSpreadStart(page));
    } else {
      const pagesEl = pagesRef.current;
      const scroller = scrollRef.current;
      if (!pagesEl || !scroller) return;
      const target = pagesEl.querySelector<HTMLDivElement>(`[data-page="${page}"]`);
      if (target) scroller.scrollTop = (target as HTMLElement).offsetTop;
    }
  }

  const readerBusy = rendering || flipLoading || flipAnimating;

  /* Cycling loading messages while PDF renders */
  const LOADING_QUOTES = [
    "Rendering your pages…",
    "Preparing a secure reading environment…",
    "Good things come to those who read…",
    "Loading your knowledge…",
    "Optimising for your screen…",
    "One moment — almost ready…",
    "Knowledge is power. Loading both…",
  ];
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  useEffect(() => {
    if (!readerBusy) return;
    const t = setInterval(() => setLoadingMsgIdx((i) => (i + 1) % LOADING_QUOTES.length), 2500);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerBusy]);
  const currentLabel = readerMode === "flip" && flipSpread
    ? flipSpread.startPage === flipSpread.endPage
      ? `Page ${flipSpread.startPage} of ${pageCount}`
      : `Pages ${flipSpread.startPage}-${flipSpread.endPage} of ${pageCount}`
    : pageCount
      ? `Page ${currentPage} of ${pageCount}`
      : "Loading pages…";
  const gestureStyle = pinchPreviewScale !== 1
    ? { transform: `scale(${pinchPreviewScale})`, transformOrigin: readerMode === "flip" ? "center center" : "center top" }
    : undefined;
  const flipMetrics = getFlipMetrics();
  const flipStageWidth = flipMetrics.stageWidth;
  const flipStageHeight = flipMetrics.stageHeight;
  const canPrevSpread = normalizeFlipSpreadStart(flipSpreadStartRef.current) > 1;
  const canNextSpread = pageCount > 1 && normalizeFlipSpreadStart(flipSpreadStartRef.current + 2) !== flipSpreadStartRef.current;
  const panCursorClass = zoom > 1.01 ? (isDraggingPan ? "cursor-grabbing" : "cursor-grab") : "";

  const renderSpreadLayer = (spread: FlipSpread, layerClass = "") => (
    <div className={`absolute inset-0 ${layerClass}`}>
      <div
        className="flex h-full w-full items-stretch justify-center"
        style={{ gap: `${flipMetrics.gap}px` }}
      >
        <div
          className="relative h-full shrink-0 overflow-hidden rounded-l-[22px] bg-[linear-gradient(180deg,#fffefc_0%,#f6efe7_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
          style={{ width: `${flipMetrics.pageWidth}px`, height: `${flipMetrics.pageHeight}px` }}
        >
          {spread.left ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spread.left.src}
              alt={`Page ${spread.left.page} of ${ebook?.title ?? "ebook"}`}
              width={spread.left.width}
              height={spread.left.height}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(180deg,#fffefb_0%,#f2ebe2_100%)]" />
          )}
        </div>
        <div
          className="relative h-full shrink-0"
          style={{ width: `${flipMetrics.gap}px`, height: `${flipMetrics.pageHeight}px` }}
        >
          <div className="absolute left-1/2 top-4 h-[calc(100%-2rem)] w-[2px] -translate-x-1/2 rounded-full bg-[rgba(76,52,32,0.14)] shadow-[0_0_18px_rgba(76,52,32,0.12)]" />
        </div>
        <div
          className="relative h-full shrink-0 overflow-hidden rounded-r-[22px] bg-[linear-gradient(180deg,#fffefc_0%,#f6efe7_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
          style={{ width: `${flipMetrics.pageWidth}px`, height: `${flipMetrics.pageHeight}px` }}
        >
          {spread.right ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spread.right.src}
              alt={`Page ${spread.right.page} of ${ebook?.title ?? "ebook"}`}
              width={spread.right.width}
              height={spread.right.height}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
              draggable={false}
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(180deg,#fffefb_0%,#f2ebe2_100%)]" />
          )}
        </div>
      </div>
    </div>
  );

  const BRAND = "#b65437";

  if (err) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8">
          <div className="text-2xl font-bold text-red-700 mb-2">Something went wrong</div>
          <p className="text-sm text-red-600">{err}</p>
          <Link
            href="/ebooks"
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: BRAND }}
          >
            ← Back to E-Books
          </Link>
        </div>
      </main>
    );
  }

  if (!ebook) {
    return (
      <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          {/* Cover skeleton */}
          <div className="space-y-4">
            <div className="animate-pulse rounded-2xl bg-[color:var(--color-light)] aspect-[4/3]" />
            <div className="animate-pulse rounded-2xl bg-[color:var(--color-light)] h-48" />
          </div>
          {/* Reader skeleton */}
          <div className="animate-pulse rounded-2xl bg-[color:var(--color-light)] h-[70vh]" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="bg-[color:var(--color-bg)] min-h-screen select-none"
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragStart={(e) => { e.preventDefault(); }}
    >
      <style jsx global>{`
        @media print { body { display: none !important; } }
        html, body, main, .secure-viewer, .secure-viewer * { user-select: none !important; }
        .reader-book-stage { perspective: 2200px; }
        .flip-sheet { transform-style: preserve-3d; backface-visibility: hidden; }
        .flip-sheet.outgoing-next { transform-origin: left center; animation: flip-out-next ${FLIP_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .flip-sheet.incoming-next { transform-origin: right center; animation: flip-in-next ${FLIP_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .flip-sheet.outgoing-prev { transform-origin: right center; animation: flip-out-prev ${FLIP_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .flip-sheet.incoming-prev { transform-origin: left center; animation: flip-in-prev ${FLIP_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes flip-out-next { from { opacity:1; transform:rotateY(0deg) translateX(0); } to { opacity:0.22; transform:rotateY(-70deg) translateX(-8%); } }
        @keyframes flip-in-next  { from { opacity:0.22; transform:rotateY(70deg) translateX(8%); } to { opacity:1; transform:rotateY(0deg) translateX(0); } }
        @keyframes flip-out-prev { from { opacity:1; transform:rotateY(0deg) translateX(0); } to { opacity:0.22; transform:rotateY(70deg) translateX(8%); } }
        @keyframes flip-in-prev  { from { opacity:0.22; transform:rotateY(-70deg) translateX(-8%); } to { opacity:1; transform:rotateY(0deg) translateX(0); } }
        /* Page placeholder shimmer while PDF renders */
        [data-page][data-state="idle"],
        [data-page][data-state="rendering"] {
          background: linear-gradient(90deg, #f3e9e0 25%, #fdf8f5 50%, #f3e9e0 75%);
          background-size: 200% 100%;
          animation: page-shimmer 1.6s ease-in-out infinite;
          border-radius: 12px;
        }
        [data-page][data-state="rendering"] { animation-duration: 1.05s; }
        @keyframes page-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes loading-bar {
          0%   { margin-left: 0;   width: 40%; }
          100% { margin-left: 60%; width: 40%; }
        }
      `}</style>

      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">

          {/* ── Left: cover + info ── */}
          <aside className="lg:sticky lg:top-20 space-y-4">
            {/* Cover */}
            <div className="overflow-hidden rounded-2xl border border-[color:var(--color-light)] bg-white shadow-md">
              {ebook.cover_url ? (
                <Image
                  src={ebook.cover_url}
                  alt={ebook.title}
                  width={1200}
                  height={900}
                  className="pointer-events-none h-auto w-full select-none"
                  priority
                  draggable={false}
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center bg-[color:var(--color-light)]/40 text-[color:var(--color-muted)]">
                  No cover available
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="rounded-2xl border border-[color:var(--color-light)] bg-white p-5 shadow-sm space-y-4">
              {/* Title + badges */}
              <div>
                <h1 className="text-xl font-bold text-[color:var(--color-ink)] leading-snug">{ebook.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-lg px-2.5 py-1 text-sm font-bold text-white"
                    style={{ background: BRAND }}
                  >
                    {price}
                  </span>
                  <span className="rounded-lg border border-[color:var(--color-light)] bg-[color:var(--color-bg)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                    NaCCA credited
                  </span>
                </div>
              </div>

              {/* Verification banner */}
              {verifying && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0 mt-0.5" fill="currentColor" aria-hidden>
                    <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/>
                  </svg>
                  <span>Verifying payment… You&apos;ll be unlocked automatically once confirmed.</span>
                </div>
              )}

              {/* Access check */}
              {own.kind === "loading" && (
                <div className="h-10 animate-pulse rounded-xl bg-[color:var(--color-light)]" />
              )}

              {/* Actions */}
              <div className="grid gap-2">
                {own.kind === "signed_out" && (
                  <>
                    <Link
                      href={`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`}
                      className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ background: BRAND }}
                    >
                      {ebook.free_for_logged_in ? "Sign in to read" : "Sign in to buy"}
                    </Link>
                    <Link
                      href={dashboardHref}
                      className="flex w-full items-center justify-center rounded-xl border border-[color:var(--color-light)] bg-white py-3 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
                    >
                      Go to Dashboard
                    </Link>
                    <p className="text-xs text-[color:var(--color-muted)] text-center">
                      {ebook.free_for_logged_in ? "Sign in to unlock reading." : "Sign in and purchase to unlock reading."}
                    </p>
                  </>
                )}

                {own.kind === "not_owner" && (
                  <>
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 shadow-sm"
                      style={{ background: BRAND }}
                    >
                      {buying ? (
                        <span className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" aria-hidden>
                            <circle cx="12" cy="12" r="10" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8" strokeWidth="3" className="opacity-75" />
                          </svg>
                          Redirecting to payment…
                        </span>
                      ) : `Buy · ${price}`}
                    </button>
                    <Link
                      href={dashboardHref}
                      className="flex w-full items-center justify-center rounded-xl border border-[color:var(--color-light)] bg-white py-3 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
                    >
                      Go to Dashboard
                    </Link>
                  </>
                )}

                {own.kind === "owner" && (
                  <>
                    <button
                      onClick={() => openReader(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
                      style={{ background: BRAND }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm10 0h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z"/>
                      </svg>
                      {showReader ? "Resume reading" : "Read now"}
                    </button>
                    <button
                      onClick={() => openReader(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--color-light)] bg-white py-3 text-sm font-semibold hover:bg-[color:var(--color-bg)] transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                      Full screen reader
                    </button>
                    <Link
                      href={dashboardHref}
                      className="flex w-full items-center justify-center rounded-xl border border-[color:var(--color-light)] bg-white py-3 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
                    >
                      Dashboard
                    </Link>
                    <p className="text-xs text-[color:var(--color-muted)] text-center">
                      Pinch to zoom in full screen. Drag when zoomed.
                    </p>
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* ── Right: reader ── */}
          <section className={isFullscreen ? "contents" : ""}>
            <div
              ref={readerWrapRef}
              className={
                isFullscreen
                  ? "fixed inset-0 z-[120] secure-viewer bg-[rgba(247,244,239,0.98)] backdrop-blur-sm"
                  : "secure-viewer rounded-2xl border border-[color:var(--color-light)] bg-white shadow-sm overflow-hidden"
              }
            >
              {/* Access locked */}
              {own.kind !== "owner" ? (
                <div className="flex h-[65vh] w-full flex-col items-center justify-center gap-5 px-6 text-center bg-[color:var(--color-bg)]/60">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(182,84,55,0.1)", color: BRAND }}
                  >
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
                      <path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3-9H9V6a3 3 0 0 1 6 0v2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[color:var(--color-ink)]">
                      {own.kind === "loading" ? "Checking access…" : "Reading access locked"}
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--color-muted)] max-w-xs">
                      {own.kind === "loading"
                        ? "Verifying your access rights…"
                        : own.kind === "signed_out"
                        ? ebook.free_for_logged_in
                          ? "Sign in to read this e-book free."
                          : "Sign in and purchase to unlock the full e-book."
                        : ebook.free_for_logged_in
                        ? "Sign in to read this e-book."
                        : "Purchase this e-book to unlock reading."}
                    </p>
                  </div>
                  {own.kind === "signed_out" && (
                    <Link
                      href={`/auth/sign-in?redirect=${encodeURIComponent(`/ebooks/${slug}`)}`}
                      className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ background: BRAND }}
                    >
                      {ebook.free_for_logged_in ? "Sign in to read" : "Sign in to buy"}
                    </Link>
                  )}
                  {own.kind === "not_owner" && (
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      style={{ background: BRAND }}
                    >
                      {buying ? "Redirecting…" : `Buy · ${price}`}
                    </button>
                  )}
                </div>

              ) : !showReader ? (
                /* Ready to read */
                <div className="flex h-[65vh] w-full flex-col items-center justify-center gap-6 px-6 text-center bg-[color:var(--color-bg)]/40">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm"
                    style={{ background: "rgba(182,84,55,0.12)", color: BRAND }}
                  >
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden>
                      <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm10 0h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[color:var(--color-ink)]">Ready to read</div>
                    <p className="mt-2 text-sm text-[color:var(--color-muted)] max-w-xs">
                      Open inline to read on this page, or launch full screen for flip mode and touch zoom.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => openReader(false)}
                      className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
                      style={{ background: BRAND }}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm10 0h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z"/></svg>
                      Read inline
                    </button>
                    <button
                      onClick={() => openReader(true)}
                      className="flex items-center gap-2 rounded-xl border border-[color:var(--color-light)] bg-white px-6 py-3 text-sm font-semibold hover:bg-[color:var(--color-bg)] transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                      Full screen
                    </button>
                  </div>
                  {pageCount > 0 && (
                    <p className="text-xs text-[color:var(--color-muted)]">{pageCount} pages</p>
                  )}
                </div>

              ) : (
                /* Active reader */
                <div className={isFullscreen ? "flex h-[100dvh] flex-col" : "relative"}>

                  {/* ── Toolbar ── */}
                  <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[color:var(--color-light)] bg-white/96 px-3 py-2.5 backdrop-blur-sm sm:px-4">
                    {/* Mode toggle */}
                    <div className="inline-flex items-center rounded-xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] p-0.5">
                      <button
                        onClick={() => { clearFlipTransition(true); setReaderMode("scroll"); }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          readerMode === "scroll"
                            ? "text-white shadow-sm"
                            : "text-[color:var(--color-ink)]/60 hover:text-[color:var(--color-ink)]"
                        }`}
                        style={readerMode === "scroll" ? { background: BRAND } : {}}
                      >
                        Scroll
                      </button>
                      {isFullscreen ? (
                        <button
                          onClick={activateFlipMode}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            readerMode === "flip"
                              ? "text-white shadow-sm"
                              : "text-[color:var(--color-ink)]/60 hover:text-[color:var(--color-ink)]"
                          }`}
                          style={readerMode === "flip" ? { background: BRAND } : {}}
                        >
                          Flip
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 text-xs text-[color:var(--color-muted)]">Flip (full screen)</span>
                      )}
                    </div>

                    {/* Zoom controls */}
                    <div className="inline-flex items-center rounded-xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] px-1 py-0.5">
                      <button onClick={() => changeZoom(-ZOOM_STEP)} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-[color:var(--color-light)]/60 transition" aria-label="Zoom out">−</button>
                      <button onClick={resetZoom} className="min-w-[3.5rem] text-center text-xs font-medium text-[color:var(--color-ink)]/75 hover:text-[color:var(--color-ink)] transition">
                        {Math.round(zoom * 100)}%
                      </button>
                      <button onClick={() => changeZoom(ZOOM_STEP)} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-[color:var(--color-light)]/60 transition" aria-label="Zoom in">+</button>
                    </div>

                    {/* Page indicator */}
                    <span className="rounded-xl border border-[color:var(--color-light)] bg-[color:var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-ink)]/70">
                      {currentLabel}
                    </span>

                    {/* Bookmark toggle */}
                    <div className="relative">
                      <button
                        onClick={() => toggleBookmark(currentPage)}
                        title={bookmarks.includes(currentPage) ? "Remove bookmark" : "Bookmark this page"}
                        className={`rounded-xl border px-2.5 py-1.5 transition flex items-center gap-1.5 text-xs font-medium ${
                          bookmarks.includes(currentPage)
                            ? "border-[color:var(--color-brand)] text-[color:var(--color-brand)] bg-[color:var(--color-brand)]/8"
                            : "border-[color:var(--color-light)] bg-white text-[color:var(--color-ink)]/60 hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg)]"
                        }`}
                      >
                        {bookmarks.includes(currentPage) ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/>
                          </svg>
                        )}
                        <span className="hidden sm:inline">Bookmark</span>
                      </button>
                    </div>

                    {/* Bookmarks panel */}
                    {bookmarks.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowBookmarks((v) => !v)}
                          className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
                            showBookmarks
                              ? "border-[color:var(--color-brand)] text-[color:var(--color-brand)] bg-[color:var(--color-brand)]/8"
                              : "border-[color:var(--color-light)] bg-white text-[color:var(--color-ink)]/60 hover:bg-[color:var(--color-bg)]"
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                          </svg>
                          <span>{bookmarks.length}</span>
                        </button>

                        {showBookmarks && (
                          <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-2xl border border-[color:var(--color-light)] bg-white shadow-xl overflow-hidden">
                            <div className="px-3 py-2 border-b border-[color:var(--color-light)] flex items-center justify-between">
                              <span className="text-xs font-semibold text-[color:var(--color-ink)]">Bookmarks</span>
                              <button onClick={() => setShowBookmarks(false)} className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] text-xs">✕</button>
                            </div>
                            <ul className="max-h-52 overflow-y-auto py-1">
                              {bookmarks.map((pg) => (
                                <li key={pg} className="flex items-center hover:bg-[color:var(--color-bg)] transition">
                                  <button
                                    onClick={() => goToPage(pg)}
                                    className={`flex flex-1 items-center gap-2 px-3 py-2 text-xs text-left ${
                                      pg === currentPage ? "text-[color:var(--color-brand)] font-semibold" : "text-[color:var(--color-ink)]"
                                    }`}
                                  >
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" aria-hidden>
                                      <path d="M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z"/>
                                    </svg>
                                    Page {pg}
                                  </button>
                                  <button
                                    onClick={() => toggleBookmark(pg)}
                                    className="pr-3 text-[color:var(--color-muted)] hover:text-red-500 transition text-[10px]"
                                    title="Remove bookmark"
                                  >
                                    ✕
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right controls */}
                    <div className="ml-auto flex items-center gap-2">
                      {readerMode === "flip" ? (
                        <>
                          <button
                            onClick={() => void goToFlipSpread(flipSpreadStartRef.current - 2)}
                            disabled={!canPrevSpread || readerBusy}
                            className="rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--color-bg)] disabled:opacity-40 transition"
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() => void goToFlipSpread(flipSpreadStartRef.current + 2)}
                            disabled={!canNextSpread || readerBusy}
                            className="rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--color-bg)] disabled:opacity-40 transition"
                          >
                            Next →
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                            className="rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--color-bg)] transition"
                          >
                            Top
                          </button>
                          <button
                            onClick={() => { const s = scrollRef.current; if (s) s.scrollTo({ top: s.scrollHeight, behavior: "smooth" }); }}
                            className="rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[color:var(--color-bg)] transition"
                          >
                            Bottom
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsFullscreen((v) => !v)}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                        style={{ background: BRAND }}
                      >
                        {isFullscreen ? "Exit full screen" : "Full screen"}
                      </button>
                    </div>
                  </div>

                  {/* ── Scroll reader ── */}
                  {readerMode === "scroll" ? (
                    <div
                      key="scroll-reader"
                      ref={scrollRef}
                      data-reader-surface="scroll"
                      className={`relative overflow-auto bg-[color:var(--color-bg)]/60 px-3 py-4 sm:px-4 ${panCursorClass} ${
                        isFullscreen ? "flex-1" : "h-[68vh] md:h-[78vh]"
                      }`}
                    >
                      <div className="mx-auto min-h-full w-fit">
                        <div
                          ref={pagesRef}
                          aria-label="Secure PDF Reader"
                          className="grid gap-4 pb-4"
                          style={gestureStyle}
                        />
                      </div>

                      {/* Loading overlay with cycling quote */}
                      {rendering && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
                          {/* Animated progress bar */}
                          <div className="w-48 overflow-hidden rounded-full bg-[color:var(--color-light)] h-1.5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                background: BRAND,
                                width: "60%",
                                animation: "loading-bar 1.4s ease-in-out infinite alternate",
                              }}
                            />
                          </div>
                          <p className="text-sm font-medium text-[color:var(--color-ink)]/70 text-center max-w-[200px] transition-all duration-500">
                            {LOADING_QUOTES[loadingMsgIdx]}
                          </p>
                        </div>
                      )}
                      {renderError && !rendering && (
                        <div className="absolute inset-x-4 top-4 rounded-2xl border border-red-200 bg-white/95 px-4 py-3 text-sm text-red-600 shadow-sm">
                          Error loading PDF: {renderError}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Flip reader ── */
                    <div
                      key="flip-reader"
                      ref={flipViewportRef}
                      data-reader-surface="flip"
                      className={`relative bg-[color:var(--color-bg)]/60 ${zoom > 1.01 ? "overflow-auto" : "overflow-hidden"} ${panCursorClass} ${
                        isFullscreen ? "flex-1" : "h-[68vh] md:h-[78vh]"
                      }`}
                    >
                      <div className="mx-auto flex min-h-full min-w-full items-start justify-center px-2 py-4 sm:px-4 sm:py-6">
                        <div
                          data-reader-stage="flip"
                          data-stage-page-width={flipMetrics.pageWidth}
                          data-stage-page-height={flipMetrics.pageHeight}
                          data-stage-gap={flipMetrics.gap}
                          data-stage-width={flipStageWidth}
                          data-stage-height={flipStageHeight}
                          className="reader-book-stage relative w-max shrink-0 overflow-hidden"
                          style={{ height: `${flipStageHeight}px`, ...gestureStyle }}
                        >
                          <div aria-hidden="true" className="pointer-events-none opacity-0" style={{ width: `${flipStageWidth}px`, height: `${flipStageHeight}px` }} />
                          {flipSpread && !outgoingFlipSpread && !incomingFlipSpread && renderSpreadLayer(flipSpread)}
                          {outgoingFlipSpread && renderSpreadLayer(outgoingFlipSpread, `flip-sheet ${flipAnimating && flipDirection ? `outgoing-${flipDirection}` : ""}`)}
                          {incomingFlipSpread && renderSpreadLayer(incomingFlipSpread, `flip-sheet ${flipAnimating && flipDirection ? `incoming-${flipDirection}` : ""}`)}
                        </div>
                      </div>

                      {flipLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
                          <div className="w-48 overflow-hidden rounded-full bg-[color:var(--color-light)] h-1.5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                background: BRAND,
                                width: "40%",
                                animation: "loading-bar 1.4s ease-in-out infinite alternate",
                              }}
                            />
                          </div>
                          <p className="text-sm font-medium text-[color:var(--color-ink)]/70 text-center max-w-[200px] transition-all duration-500">
                            {LOADING_QUOTES[loadingMsgIdx]}
                          </p>
                        </div>
                      )}
                      {renderError && !flipLoading && (
                        <div className="absolute inset-x-4 top-4 rounded-2xl border border-red-200 bg-white/95 px-4 py-3 text-sm text-red-600 shadow-sm">
                          Error loading PDF: {renderError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── About section ── */}
        {ebook.description && (
          <section className="mt-6 rounded-2xl border border-[color:var(--color-light)] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND }}>About this e-book</p>
            <p className="whitespace-pre-line text-[color:var(--color-ink)]/75 leading-relaxed">{ebook.description}</p>
            <div className="mt-5 flex items-center gap-4">
              <Link
                href="/ebooks"
                className="text-sm font-medium underline decoration-dotted underline-offset-4 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition"
              >
                ← Back to E-Books
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

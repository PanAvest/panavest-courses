"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import SimpleCertificate from "@/components/SimpleCertificate";

/* ───────────────────────────────── Types ───────────────────────────────── */
type CourseRow = { id: string; slug: string; title: string; img: string | null; cpd_points: number | null };
type EnrollmentRow = { course_id: string; progress_pct: number | null; courses?: CourseRow | CourseRow[] | null };
type EnrolledCourse = { course_id: string; progress_pct: number; title: string; slug: string; img: string | null; cpd_points: number | null };
type QuizAttempt = { course_id: string; chapter_id: string; total_count: number; correct_count: number; score_pct: number; completed_at: string };
type ChapterInfo = { id: string; title: string; order_index: number; course_id: string };
type EbookRow = { id: string; slug: string; title: string; cover_url: string | null; price_cents: number };
type PurchaseRow = { ebook_id: string; status: string | null; ebooks?: EbookRow | EbookRow[] | null };
type PurchasedEbook = { ebook_id: string; slug: string; title: string; cover_url: string | null; price_cedis: string };
type ProfileRow = { id: string; full_name: string | null; updated_at?: string | null };

type CertificateRow = {
  id: string;
  user_id: string;
  course_id: string;
  attempt_id: string | null;
  score_pct: number | null;
  certificate_no: string;
  issued_at: string;
  courses: { title: string; slug: string; img: string | null; cpd_points?: number | null } | null;
};

type CourseMeta = { title: string; slug: string; cpd_points?: number | null; img?: string | null };
type ExamRow = { id: string; course_id: string; title: string | null; pass_mark: number | null };
type AttemptRow = { id: string; user_id: string; exam_id: string; score: number | null; passed: boolean | null; created_at: string };

/* ─────────────────────────────── Helpers ─────────────────────────────── */
function pickCourse(c: CourseRow | CourseRow[] | null | undefined): CourseRow | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}
function pickEbook(e: EbookRow | EbookRow[] | null | undefined): EbookRow | null {
  if (!e) return null;
  return Array.isArray(e) ? (e[0] ?? null) : e;
}

/* ───────────────────────────── Component ───────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();

  // Auth gate
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState("");

  // UI/data state
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [quiz, setQuiz] = useState<QuizAttempt[]>([]);
  const [chaptersById, setChaptersById] = useState<Record<string, ChapterInfo>>({});
  const [ebooks, setEbooks] = useState<PurchasedEbook[]>([]);
  const [certs, setCerts] = useState<CertificateRow[]>([]);
  const [provisionalCerts, setProvisionalCerts] = useState<
    { course_id: string; course_title: string; course_slug: string; img: string | null; cpd_points: number | null; score_pct: number; passed_at: string }[]
  >([]);
  const [courseMetaMap, setCourseMetaMap] = useState<Record<string, CourseMeta>>({});
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  /* ── Stable auth gate ── */
  useEffect(() => {
    let cancelled = false;
    let redirected = false;
    let t: ReturnType<typeof setTimeout> | null = null;

    const safeReplace = (to: string) => {
      if (redirected || cancelled) return;
      redirected = true;
      router.replace(to);
    };

    const verify = async () => {
      const { data: s1 } = await supabase.auth.getSession();
      if (cancelled) return;
      if (s1.session) {
        setUserId(s1.session.user.id);
        setSessionReady(true);
        return;
      }
      t = setTimeout(async () => {
        const { data: s2 } = await supabase.auth.getSession();
        if (cancelled) return;
        if (s2.session) {
          setUserId(s2.session.user.id);
          setSessionReady(true);
        } else {
          safeReplace("/auth/sign-in?next=/dashboard");
        }
      }, 350);
    };

    verify();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session) {
        setUserId(session.user.id);
        setSessionReady(true);
        redirected = false;
      } else if (event === "SIGNED_OUT") {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) safeReplace("/auth/sign-in?next=/dashboard");
      }
    });

    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  /* ── Data load with AbortController (prevents stale updates) ── */
  useEffect(() => {
    if (!sessionReady || !userId) return;

    const ac = new AbortController();
    const { signal } = ac;
    let alive = true;

    (async () => {
      setLoading(true);

      // Helper: short-circuit if aborted
      const guard = () => !(signal.aborted || !alive);

      const safeSelect = async <T,>(label: string, fn: () => Promise<{ data: T | null; error: unknown }>): Promise<T> => {
        try {
          const { data, error } = await fn();
          if (error) {
            console.warn(`${label} fetch error`, error);
          }
      return (data as T) ?? ([] as unknown as T);
    } catch (err) {
      console.warn(`${label} fetch failed`, err);
      return [] as unknown as T;
    }
  };

      // Profile
      const { data: prof } = await supabase.from("profiles").select("id, full_name, updated_at").eq("id", userId).maybeSingle();
      if (!guard()) return;
      const p = (prof as unknown as ProfileRow) || null;
      const initialName = (p?.full_name ?? "").trim();
      setFullName(initialName);
      setNameDraft(initialName);

      // Enrollments (+ courses)
      const { data: enrData } = await supabase
        .from("enrollments")
        .select("course_id, progress_pct, courses!inner(id,title,slug,img,cpd_points)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (!guard()) return;

      const localMeta: Record<string, CourseMeta> = {};
      let enrolledTmp: EnrolledCourse[] = [];
      let courseIds: string[] = [];

      if (enrData) {
        const rows = enrData as unknown as EnrollmentRow[];
        enrolledTmp = rows.map((r) => {
          const c = pickCourse(r.courses) || { id: "", slug: "", title: "", img: null, cpd_points: null };
          if (r.course_id) courseIds.push(r.course_id);
          if (r.course_id && c.title) {
            localMeta[r.course_id] = { title: c.title, slug: c.slug, cpd_points: c.cpd_points ?? null, img: c.img ?? null };
          }
          return { course_id: r.course_id, progress_pct: 0, title: c.title, slug: c.slug, img: c.img ?? null, cpd_points: c.cpd_points ?? null };
        });
      }

      // Compute progress from slides
      courseIds = Array.from(new Set(courseIds));
      const courseIdsForProvisional: string[] = courseIds.slice();
      if (courseIds.length > 0) {
        const { data: chRows } = await supabase.from("course_chapters").select("id,course_id").in("course_id", courseIds);
        if (!guard()) return;
        const chaptersByCourse: Record<string, string[]> = {};
        (chRows ?? []).forEach((r: { id: string; course_id: string }) => {
          (chaptersByCourse[r.course_id] ||= []).push(r.id);
        });

        const allChapterIds = Object.values(chaptersByCourse).flat();

        const totalSlidesByCourse: Record<string, number> = {};
        if (allChapterIds.length > 0) {
          const { data: slRows } = await supabase.from("course_slides").select("id,chapter_id").in("chapter_id", allChapterIds);
          if (!guard()) return;
          const slidesByChapterCount: Record<string, number> = {};
          (slRows ?? []).forEach((s: { id: string; chapter_id: string }) => {
            slidesByChapterCount[s.chapter_id] = (slidesByChapterCount[s.chapter_id] ?? 0) + 1;
          });
          for (const cid of courseIdsForProvisional) {
            const chIds = chaptersByCourse[cid] ?? [];
            totalSlidesByCourse[cid] = chIds.reduce((acc, chId) => acc + (slidesByChapterCount[chId] ?? 0), 0);
          }
        }

        const { data: progRows } = await supabase
          .from("user_slide_progress")
          .select("course_id, slide_id")
          .eq("user_id", userId)
          .in("course_id", courseIds);
        if (!guard()) return;

        const doneByCourse: Record<string, Set<string>> = {};
        (progRows ?? []).forEach((r: { course_id: string; slide_id: string }) => {
          (doneByCourse[r.course_id] ||= new Set<string>()).add(r.slide_id);
        });

        enrolledTmp = enrolledTmp.map((e) => {
          const total = Math.max(0, totalSlidesByCourse[e.course_id] ?? 0);
          const done = doneByCourse[e.course_id]?.size ?? 0;
          const pct = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
          return { ...e, progress_pct: pct };
        });
      }
      setEnrolled(enrolledTmp);

      // Purchased E-Books (paid only)
      const { data: purRows } = await supabase
        .from("ebook_purchases")
        .select("ebook_id,status,ebooks!inner(id,slug,title,cover_url,price_cents)")
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (!guard()) return;

      if (purRows) {
        const items = (purRows as unknown as PurchaseRow[])
          .map((p) => {
            const e = pickEbook(p.ebooks);
            if (!e) return null;
            return { ebook_id: p.ebook_id, slug: e.slug, title: e.title, cover_url: e.cover_url ?? null, price_cedis: `GH₵ ${((e.price_cents ?? 0) / 100).toFixed(2)}` } as PurchasedEbook;
          })
          .filter(Boolean) as PurchasedEbook[];
        setEbooks(items);
      }

      // Quiz attempts
      const quizRows = await safeSelect(
        "user_chapter_quiz",
        async () =>
          await supabase
            .from("user_chapter_quiz")
            .select("course_id, chapter_id, total_count, correct_count, score_pct, completed_at")
            .eq("user_id", userId),
      );
      if (!guard()) return;

      const attempts = (quizRows as unknown as QuizAttempt[]) ?? [];
      setQuiz(attempts);

      // Chapter meta for ordering
      const chapterIds = Array.from(new Set(attempts.map((a) => a.chapter_id))).filter(Boolean);
      if (chapterIds.length > 0) {
        const { data: chapterRows } = await supabase.from("course_chapters").select("id,title,order_index,course_id").in("id", chapterIds);
        if (!guard()) return;
        const map: Record<string, ChapterInfo> = {};
        (chapterRows as unknown as ChapterInfo[] | null | undefined)?.forEach((row) => {
          map[row.id] = { id: row.id, title: row.title, order_index: Number(row.order_index ?? 0), course_id: row.course_id };
        });
        setChaptersById(map);
      }

      // Ensure Course Meta (title/slug/cpd/img) for anything missing
      const existingIds = new Set(Object.keys(courseMetaMap));
      const metaMissingFromQuiz = Array.from(new Set(attempts.map((a) => a.course_id))).filter(Boolean).filter((cid) => !existingIds.has(cid));
      const metaMissingFromEnroll = Array.from(new Set(enrolledTmp.map((e) => e.course_id))).filter((cid) => !existingIds.has(cid));
      const toFetch = Array.from(new Set([...metaMissingFromQuiz, ...metaMissingFromEnroll]));
      if (toFetch.length > 0) {
        const { data: courseRows } = await supabase.from("courses").select("id,title,slug,cpd_points,img").in("id", toFetch);
        if (!guard()) return;
        (courseRows as CourseRow[] | null | undefined)?.forEach((cr) => {
          courseMetaMap[cr.id] = { title: cr.title, slug: cr.slug, cpd_points: cr.cpd_points ?? null, img: cr.img ?? null };
        });
        setCourseMetaMap({ ...courseMetaMap });
      }

      /* ───────── Certificates (no join; hydrate meta) ───────── */
      let certificateNoMissing = false;
      let certRows: unknown[] | null = null;
      let certErr: unknown = null;
      try {
        const primary = await supabase
          .from("certificates")
          .select("id,user_id,course_id,attempt_id,certificate_no,issued_at")
          .eq("user_id", userId)
          .order("issued_at", { ascending: false });
        if (!guard()) return;
        certRows = primary.data ?? [];
        certErr = primary.error;
      } catch (err) {
        console.warn("certificates fetch failed", err);
        certRows = [];
        certErr = err;
      }
      if (certErr && typeof certErr === "object" && (certErr as { code?: string }).code === "42703") {
        certificateNoMissing = true;
        try {
          const fallback = await supabase
            .from("certificates")
            .select("id,user_id,course_id,attempt_id,issued_at")
            .eq("user_id", userId)
            .order("issued_at", { ascending: false });
          if (!guard()) return;
          certRows = fallback.data ?? [];
          certErr = fallback.error;
        } catch (err) {
          console.warn("certificates fallback fetch failed", err);
          certRows = [];
          certErr = err;
        }
      }
      if (certErr) console.error("certificates fetch error", certErr);

      const bare = (certRows ?? []) as {
        id: string; user_id: string; course_id: string; attempt_id: string | null; certificate_no?: string | null; issued_at: string;
      }[];

      const attemptIds = Array.from(new Set(bare.map((c) => c.attempt_id).filter(Boolean))) as string[];
      const attemptScores: Record<string, number> = {};
      if (attemptIds.length > 0) {
        try {
          const { data: attemptRows, error: attemptErr } = await supabase
            .from("attempts")
            .select("id,score")
            .in("id", attemptIds);
          if (!guard()) return;
          if (attemptErr) console.error("attempts fetch error", attemptErr);
          (attemptRows ?? []).forEach((row: { id: string; score: number | null }) => {
            attemptScores[row.id] = Math.round(Number(row.score ?? 0));
          });
        } catch (err) {
          console.warn("attempts fetch failed", err);
        }
      }

      const certCourseIds = Array.from(new Set(bare.map((c) => c.course_id))).filter(Boolean);
      const missingForCerts = certCourseIds.filter((cid) => !courseMetaMap[cid]);
      if (missingForCerts.length > 0) {
        const { data: moreCourses } = await supabase.from("courses").select("id,title,slug,img,cpd_points").in("id", missingForCerts);
        if (!guard()) return;
        (moreCourses as CourseRow[] | null | undefined)?.forEach((cr) => {
          courseMetaMap[cr.id] = { title: cr.title, slug: cr.slug, cpd_points: cr.cpd_points ?? null, img: cr.img ?? null };
        });
        setCourseMetaMap({ ...courseMetaMap });
      }

      const mergedCerts: CertificateRow[] = bare.map((c) => {
        const certificateNumber =
          typeof c.certificate_no === "string" && c.certificate_no.trim().length > 0
            ? c.certificate_no
            : certificateNoMissing
              ? makeKdsCertId(userId, c.course_id)
              : makeKdsCertId(userId, c.course_id);
        const meta = courseMetaMap[c.course_id];
        return {
          ...c,
          certificate_no: certificateNumber,
          score_pct: c.attempt_id ? attemptScores[c.attempt_id] ?? null : null,
          courses: meta
            ? { title: meta.title, slug: meta.slug, img: meta.img ?? null, cpd_points: meta.cpd_points ?? null }
            : { title: "Course", slug: "", img: null, cpd_points: null },
        };
      });
      setCerts(mergedCerts);

      /* ───────── Provisional (passed + 100% progress) ───────── */
      if (courseIds.length > 0) {
        const { data: examRows, error: examErr } = await supabase.from("exams").select("id,course_id,title,pass_mark").in("course_id", courseIds);
        if (!guard()) return;
        if (examErr) console.warn("exams fetch error", examErr);
        const examByCourse: Record<string, ExamRow> = {};
        const examIds: string[] = [];
        (examRows ?? []).forEach((e: ExamRow) => {
          examByCourse[e.course_id] = e;
          examIds.push(e.id);
        });

        let latestByExam: Record<string, AttemptRow> = {};
        if (examIds.length > 0) {
          const { data: attRows, error: attErr } = await supabase
            .from("attempts")
            .select("id,user_id,exam_id,score,passed,created_at")
            .eq("user_id", userId)
            .in("exam_id", examIds)
            .order("created_at", { ascending: false });
          if (!guard()) return;
          if (attErr) console.warn("attempts fetch error", attErr);

          latestByExam = {};
          (attRows ?? []).forEach((a: AttemptRow) => {
            if (!latestByExam[a.exam_id]) latestByExam[a.exam_id] = a;
          });
        }

        const realCertCourseIds = new Set(mergedCerts.map((c) => c.course_id));
        const progressByCourse: Record<string, number> = {};
        for (const e of enrolledTmp) progressByCourse[e.course_id] = e.progress_pct;

        const provisional: {
          course_id: string; course_title: string; course_slug: string; img: string | null; cpd_points: number | null; score_pct: number; passed_at: string;
        }[] = [];

        for (const cid of courseIds) {
          if (realCertCourseIds.has(cid)) continue;
          const exam = examByCourse[cid];
          if (!exam) continue;
          const att = latestByExam[exam.id];
          const passed = !!(att && att.passed && (att.score ?? 0) >= (exam.pass_mark ?? 0));
          const hundred = (progressByCourse[cid] ?? 0) >= 100;

          if (passed && hundred) {
            const meta = courseMetaMap[cid] || { title: "Course", slug: "", cpd_points: null, img: null };
            provisional.push({
              course_id: cid,
              course_title: meta.title,
              course_slug: meta.slug,
              img: meta.img ?? null,
              cpd_points: (meta.cpd_points ?? null) as number | null,
              score_pct: Math.round(Number(att?.score ?? 0)),
              passed_at: att!.created_at,
            });
          }
        }

        setProvisionalCerts(provisional);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [sessionReady, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save display name (used by cert)
  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!userId || !trimmed) return;
    await supabase.from("profiles").upsert({ id: userId, full_name: trimmed, updated_at: new Date().toISOString() });
    setFullName(trimmed);
    setIsEditingName(false);
  }

  // Group quiz results by course
  const quizByCourse = useMemo(() => {
    const grouped: Record<string, { attempt: QuizAttempt; chapter: ChapterInfo }[]> = {};
    for (const a of quiz) {
      const ch = chaptersById[a.chapter_id];
      if (!ch) continue;
      (grouped[a.course_id] ||= []).push({ attempt: a, chapter: ch });
    }
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((l, r) => (l.chapter.order_index ?? 0) - (r.chapter.order_index ?? 0));
    }
    return grouped;
  }, [quiz, chaptersById]);

  const makeKdsCertId = (u: string, courseId?: string) => `KDS-${u.slice(0, 8).toUpperCase()}${courseId ? "-" + courseId.slice(0, 6).toUpperCase() : ""}`;
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "https://kdslearning.com";

  const downloadCertPdf = async (
    certId: string,
    {
      recipient,
      course,
      issuedAt,
      certNumber,
      verifyUrl,
    }: { recipient: string; course: string; issuedAt: string | Date; certNumber: string; verifyUrl?: string },
  ) => {
    try {
      if (downloadingCertId) return;
      setDownloadingCertId(certId);
      const { jsPDF } = await import("jspdf");
      if (typeof window === "undefined") throw new Error("No window");

      const toDataUrl = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`asset fetch failed: ${url}`);
        const blob = await res.blob();
        const buf = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        return `data:${blob.type};base64,${base64}`;
      };

      const sidebarLogoUrl = "https://icujvqmqwacpysxjfkxd.supabase.co/storage/v1/object/public/Cert%20Assets/Panavest%20logo%20trans%20white.png";
      const signatureUrl = "https://icujvqmqwacpysxjfkxd.supabase.co/storage/v1/object/public/Cert%20Assets/Prof%20Signature.png";

      const [sidebarLogoData, sigData, qrData] = await Promise.all([
        toDataUrl(sidebarLogoUrl).catch(() => ""),
        toDataUrl(signatureUrl).catch(() => ""),
        verifyUrl ? toDataUrl(`https://quickchart.io/qr?text=${encodeURIComponent(verifyUrl)}&size=280&margin=1`).catch(() => "") : Promise.resolve(""),
      ]);

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const safeZone = 40;
      const sidebarWidth = 80;
      const dividerWidth = 1.5;
      const visualCenterY = pageHeight / 2 - 15;
      const navy: [number, number, number] = [10, 17, 86];
      const gold: [number, number, number] = [210, 167, 86];
      const background: [number, number, number] = [252, 250, 245];
      const darkGrey: [number, number, number] = [70, 75, 85];
      const midGrey: [number, number, number] = [120, 125, 135];
      const lightGrey: [number, number, number] = [180, 183, 190];
      const contentLeft = sidebarWidth + 12;
      const contentRight = pageWidth - safeZone;
      const contentWidth = contentRight - contentLeft;
      const contentCenterX = contentLeft + contentWidth / 2;

      // Background
      doc.setFillColor(...background);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      // Sidebar and divider
      doc.setFillColor(...navy);
      doc.rect(0, 0, sidebarWidth, pageHeight, "F");
      doc.setDrawColor(...gold);
      doc.setLineWidth(dividerWidth);
      doc.line(sidebarWidth, 0, sidebarWidth, pageHeight);

      // Sidebar top logo
      const emblemX = sidebarWidth / 2;
      const emblemY = safeZone;
      const sidebarLogoW = 36;
      const sidebarLogoH = 36;
      if (sidebarLogoData) {
        doc.addImage(sidebarLogoData, "PNG", emblemX - sidebarLogoW / 2, emblemY - sidebarLogoH / 2, sidebarLogoW, sidebarLogoH, undefined, "FAST");
      }

      // Sidebar QR
      const qrBoxSize = 44;
      const qrBoxX = emblemX - qrBoxSize / 2;
      const qrBoxTop = pageHeight - safeZone - qrBoxSize;
      doc.setFillColor(255, 255, 255);
      doc.rect(qrBoxX, qrBoxTop, qrBoxSize, qrBoxSize, "F");
      if (qrData) {
        const qrInset = 4;
        doc.addImage(qrData, "PNG", qrBoxX + qrInset, qrBoxTop + qrInset, qrBoxSize - qrInset * 2, qrBoxSize - qrInset * 2, undefined, "FAST");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Scan to verify", emblemX, qrBoxTop + qrBoxSize + 6, { align: "center" });

      // Main header
      doc.setTextColor(...navy);
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      const headerDims = doc.getTextDimensions("PANAVEST INTERNATIONAL");
      doc.text("PANAVEST INTERNATIONAL", contentCenterX, safeZone + headerDims.h, { align: "center" });

      // Core block
      const courseLines = doc.splitTextToSize(course || "Course Title", 160);
      const blockItems: {
        text: string | string[];
        font: "times" | "helvetica";
        style: "bold" | "normal" | "italic";
        size: number;
        color: [number, number, number];
        underline?: boolean;
        spacingAfter?: number;
      }[] = [
        { text: "CERTIFICATE", font: "times", style: "bold", size: 34, color: gold, spacingAfter: 5 },
        { text: "of Appreciation", font: "helvetica", style: "normal", size: 12, color: midGrey, spacingAfter: 7 },
        { text: "Proudly Presented To", font: "helvetica", style: "normal", size: 9, color: darkGrey, spacingAfter: 6 },
        { text: recipient || "Recipient Name", font: "times", style: "italic", size: 26, color: navy, underline: true, spacingAfter: 6 },
        { text: "for successfully completing", font: "helvetica", style: "normal", size: 9, color: darkGrey, spacingAfter: 5 },
        { text: courseLines, font: "times", style: "bold", size: 16, color: navy, spacingAfter: 0 },
      ];

      let blockHeight = 0;
      for (const item of blockItems) {
        doc.setFont(item.font, item.style);
        doc.setFontSize(item.size);
        const dims = doc.getTextDimensions(Array.isArray(item.text) ? item.text.join("\n") : item.text);
        blockHeight += dims.h;
        if (item.underline) blockHeight += 4;
        blockHeight += item.spacingAfter ?? 0;
      }
      let yCursor = visualCenterY - blockHeight / 2;

      for (const item of blockItems) {
        doc.setFont(item.font, item.style);
        doc.setFontSize(item.size);
        doc.setTextColor(...item.color);
        const dims = doc.getTextDimensions(Array.isArray(item.text) ? item.text.join("\n") : item.text);
        const baselineY = yCursor + dims.h;
        doc.text(item.text, contentCenterX, baselineY, { align: "center" });
        yCursor += dims.h;

        if (item.underline) {
          const nameWidth = Math.min(
            doc.getTextWidth(typeof item.text === "string" ? item.text : item.text.join(" ")) + 12,
            contentWidth - 20,
          );
          const lineStart = contentCenterX - nameWidth / 2;
          const lineY = yCursor + 2;
          doc.setDrawColor(...lightGrey);
          doc.setLineWidth(0.5);
          doc.line(lineStart, lineY, lineStart + nameWidth, lineY);
          yCursor += 4;
        }

        yCursor += item.spacingAfter ?? 0;
      }

      // Footer
      const footerBaseline = pageHeight - safeZone;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...darkGrey);
      doc.text(`Issued: ${new Date(issuedAt).toLocaleDateString()}`, contentLeft, footerBaseline - 8, { align: "left" });
      doc.text(`Certificate No: ${certNumber}`, contentLeft, footerBaseline - 2, { align: "left" });

      const signatureLineWidth = 70;
      const signatureLineX1 = contentRight - signatureLineWidth;
      const signatureLineX2 = contentRight;
      const signatureHeight = 18;
      const signatureY = footerBaseline - signatureHeight;
      if (sigData) {
        doc.addImage(sigData, "PNG", signatureLineX1, signatureY, signatureLineWidth, signatureHeight, undefined, "FAST");
      } else {
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(...navy);
        doc.text("Signature on file", signatureLineX1 + signatureLineWidth / 2, signatureY + signatureHeight / 2, { align: "center", baseline: "middle" });
      }
      doc.setDrawColor(...navy);
      doc.setLineWidth(0.6);
      doc.line(signatureLineX1, footerBaseline, signatureLineX2, footerBaseline);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Authorized Signatory", signatureLineX2, footerBaseline + 6, { align: "right" });

      const filename = certNumber ? `PanAvest-Certificate-${certNumber}.pdf` : "PanAvest-Certificate.pdf";
      doc.save(filename);
    } catch (err) {
      console.error("Certificate PDF generation failed", err);
      if (typeof window !== "undefined") {
        window.alert("We could not download the certificate. Please try again.");
      }
    } finally {
      setDownloadingCertId(null);
    }
  };

  if (!sessionReady) {
    return (
      <div className="mx-auto max-w-screen-lg px-4 md:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Welcome</h1>
        <p className="mt-2 text-xs text-gray-500">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-lg px-4 md:px-6 py-8">
      {/* Welcome header with persistent name */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">{fullName ? `Welcome, ${fullName}` : "Welcome"}</h1>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="rounded-lg border px-3 py-1.5 text-sm bg-white hover:bg-gray-50"
            title="Profile settings"
          >
            ⚙️ Settings
          </Link>
          {!isEditingName ? (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="rounded-lg border px-3 py-1.5 text-sm"
              title="Your certificate uses this name"
            >
              {fullName ? "Edit name" : "Add name"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                className="rounded-md border px-3 py-1.5 text-sm"
                placeholder="Your full name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
              <button type="button" onClick={saveName} className="rounded-lg bg-[color:#0a1156] text-white px-3 py-1.5 text-sm">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setNameDraft(fullName);
                }}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">Your certificate displays the name set here. You can update it anytime and re-download.</p>

      {loading && <p className="mt-4 text-muted">Loading…</p>}

      {!loading && (
        <>
          {/* Purchased E-Books */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Purchased E-Books</h2>
            {ebooks.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">No purchased e-books yet.</p>
                <Link href="/ebooks" className="mt-2 inline-block rounded-lg bg-[color:#0a1156] px-4 py-2 text-white">
                  Browse e-books
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {ebooks.map((b) => (
                  <div key={b.ebook_id} className="rounded-xl border border-light bg-white overflow-hidden">
                    <div className="relative w-full h-40">
                      <Image src={b.cover_url || "/project-management.png"} alt={b.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                    <div className="p-4">
                      <div className="font-semibold line-clamp-1">{b.title}</div>
                      <div className="mt-1 text-xs text-muted">Purchased · {b.price_cedis}</div>
                      <Link href={`/ebooks/${b.slug}`} className="mt-3 inline-block rounded-lg bg-[color:#0a1156] px-3 py-1.5 text-white">
                        Read
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Continue learning */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Continue learning</h2>
            {enrolled.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">You haven’t enrolled yet.</p>
                <Link href="/courses" className="mt-2 inline-block rounded-lg bg-[color:#0a1156] px-4 py-2 text-white">
                  Browse knowledge
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {enrolled.map((c) => (
                  <div key={c.course_id} className="rounded-xl border border-light bg-white overflow-hidden">
                    <div className="relative w-full h-40">
                      <Image src={c.img || "/project-management.png"} alt={c.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                    </div>
                    <div className="p-4">
                      <div className="font-semibold line-clamp-1">{c.title}</div>
                      <div className="mt-2 h-2 w-full bg-[color:var(--color-light)] rounded">
                        <div className="h-2 bg-[color:#0a1156] rounded" style={{ width: `${c.progress_pct}%` }} />
                      </div>
                      <div className="mt-2 text-xs text-muted">{Math.round(c.progress_pct)}% complete</div>
                      <Link href={`/knowledge/${c.slug}/dashboard`} className="mt-3 inline-block rounded-lg bg-[color:#0a1156] px-3 py-1.5 text-white">
                        Resume
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Course Certificates (real + provisional) */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Certificates</h2>

            {(certs?.length ?? 0) + (provisionalCerts?.length ?? 0) === 0 ? (
              <p className="mt-3 text-muted">No certificates yet. Complete a course and pass the final exam to earn one.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Real certificates */}
                {certs.map((c) => {
                  const courseTitle = c.courses?.title ?? "Course";
                  const courseSlug = c.courses?.slug ?? "";
                  const bg = c.courses?.img ?? "/project-management.png";
                  const cpd = (c.courses?.cpd_points ?? null) as number | null;
                  const kdsCertId = makeKdsCertId(userId, c.course_id);
                  const verifyUrl = `${origin}/verify?cert_id=${encodeURIComponent(c.id)}`;

                  return (
                    <div key={c.id} className="rounded-xl border border-light bg-white overflow-hidden">
                      <div className="relative w-full h-36">
                        <Image src={bg} alt={courseTitle} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold line-clamp-1">{courseTitle}</div>
                          {courseSlug && (
                            <Link href={`/knowledge/${courseSlug}/dashboard`} className="text-xs rounded-md px-2 py-1 bg-[color:var(--color-light)]">
                              View course
                            </Link>
                          )}
                        </div>

                        <div className="mt-2 text-sm">
                          <div><span className="font-medium">Issued to:</span> {fullName || "—"}</div>
                          <div className="text-muted text-xs">Certificate No: {c.certificate_no}</div>
                          <div className="text-muted text-xs">Issued: {new Date(c.issued_at).toLocaleString()}</div>
                          {cpd != null && <div className="text-muted text-xs">CPD/CPPD: {cpd}</div>}
                        </div>

                        {/* Inline preview */}
                        <details className="mt-3 rounded-lg border border-dashed p-3 open:shadow-sm">
                          <summary className="cursor-pointer text-sm font-medium">Preview certificate</summary>
                          <div className="mt-4">
                            <SimpleCertificate
                              recipient={fullName || "Your Name"}
                              course={courseTitle}
                              date={c.issued_at}
                              certId={kdsCertId}
                              qrValue={verifyUrl}
                              showPrint={false}
                              accent="#0a1156"
                            />
                          </div>
                        </details>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              downloadCertPdf(c.id, {
                                recipient: fullName || "Your Name",
                                course: courseTitle,
                                issuedAt: c.issued_at,
                                certNumber: kdsCertId,
                                verifyUrl,
                              })
                            }
                            disabled={downloadingCertId === c.id}
                            className="rounded-lg bg-[color:#0a1156] text-white px-3 py-1.5 text-sm disabled:opacity-60"
                          >
                            {downloadingCertId === c.id ? "Preparing…" : "Download certificate"}
                          </button>
                          <div className="text-xs text-muted">Final score: {c.score_pct != null ? `${c.score_pct}%` : "—"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Provisional certs */}
                {provisionalCerts.map((pc) => {
                  const kdsCertId = makeKdsCertId(userId, pc.course_id);
                  return (
                    <div key={`provisional-${pc.course_id}`} className="rounded-xl border border-light bg-white overflow-hidden">
                      <div className="relative w-full h-36">
                        <Image src={pc.img ?? "/project-management.png"} alt={pc.course_title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold line-clamp-1">{pc.course_title}</div>
                          {pc.course_slug && (
                            <Link href={`/knowledge/${pc.course_slug}/dashboard`} className="text-xs rounded-md px-2 py-1 bg-[color:var(--color-light)]">
                              View course
                            </Link>
                          )}
                        </div>

                        <div className="mt-2 text-sm">
                          <div><span className="font-medium">Issued to:</span> {fullName || "—"}</div>
                          <div className="text-muted text-xs">Status: Provisional (awaiting issuance)</div>
                          <div className="text-muted text-xs">Passed: {new Date(pc.passed_at).toLocaleString()}</div>
                          {pc.cpd_points != null && <div className="text-muted text-xs">CPD/CPPD: {pc.cpd_points}</div>}
                        </div>

                        <details className="mt-3 rounded-lg border border-dashed p-3 open:shadow-sm">
                          <summary className="cursor-pointer text-sm font-medium">Preview (print/save)</summary>
                          <div className="mt-4">
                            <SimpleCertificate
                              recipient={fullName || "Your Name"}
                              course={pc.course_title}
                              date={pc.passed_at}
                              certId={kdsCertId}
                              qrProvider="none"
                              showPrint
                              accent="#0a1156"
                            />
                          </div>
                        </details>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="rounded-lg px-3 py-1.5 text-xs bg-gray-100 text-gray-600">Official download available after issuance</span>
                          <div className="text-xs text-muted">Final score: {pc.score_pct}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quiz results */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Your quiz results</h2>
            {Object.keys(quizByCourse).length === 0 ? (
              <p className="mt-3 text-muted">No quiz attempts yet.</p>
            ) : (
              <div className="mt-4 grid gap-4">
                {Object.entries(quizByCourse).map(([courseId, rows]) => {
                  const meta = courseMetaMap[courseId];
                  return (
                    <div key={courseId} className="rounded-xl border border-light bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">{meta?.title ?? "Course"}</div>
                        {meta?.slug && (
                          <Link href={`/knowledge/${meta.slug}/dashboard`} className="text-sm rounded-lg px-3 py-1.5 bg-[color:var(--color-light)]">
                            Go to course
                          </Link>
                        )}
                      </div>

                      <ul className="mt-3 grid gap-2">
                        {rows.map(({ attempt, chapter }) => (
                          <li key={`${attempt.course_id}-${attempt.chapter_id}-${attempt.completed_at}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg ring-1 ring-[var(--color-light)] px-3 py-2">
                            <div className="min-w-0">
                              <div className="font-medium line-clamp-1">{chapter.title}</div>
                              <div className="text-xs text-muted">
                                {attempt.correct_count}/{attempt.total_count} correct · {new Date(attempt.completed_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-[color:var(--color-light)]">
                                {attempt.score_pct}%
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

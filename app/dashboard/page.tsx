"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PageSkeleton from "@/components/PageSkeleton";
import { supabase } from "@/lib/supabaseClient";
import SimpleCertificate from "@/components/SimpleCertificate";

/* ───────────────────────────────── Types ───────────────────────────────── */
type CourseRow = { id: string; slug: string; title: string; img: string | null; cpd_points: number | null };
type EnrollmentRow = { course_id: string; progress_pct: number | null; courses?: CourseRow | CourseRow[] | null };
type EnrolledCourse = { course_id: string; progress_pct: number; title: string; slug: string; img: string | null; cpd_points: number | null };
type QuizAttempt = { course_id: string; chapter_id: string; total_count: number; correct_count: number; score_pct: number; completed_at: string };
type ChapterInfo = { id: string; title: string; order_index: number; course_id: string };
type EbookRow = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_cents: number;
  free_for_logged_in?: boolean | null;
};
type PurchaseRow = { ebook_id: string; status: string | null; ebooks?: EbookRow | EbookRow[] | null };
type PurchasedEbook = {
  ebook_id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  price_cedis: string;
  access_label: "Purchased" | "Free with login";
};
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

      // Add free-with-login courses so logged-in users can start them without payment.
      const { data: freeCourseRows } = await supabase
        .from("courses")
        .select("id,title,slug,img,cpd_points")
        .eq("published", true)
        .eq("free_for_logged_in", true)
        .order("title", { ascending: true });
      if (!guard()) return;
      const enrolledCourseIds = new Set(enrolledTmp.map((c) => c.course_id));
      (freeCourseRows as CourseRow[] | null | undefined)?.forEach((c) => {
        if (!c?.id || enrolledCourseIds.has(c.id)) return;
        enrolledCourseIds.add(c.id);
        courseIds.push(c.id);
        localMeta[c.id] = {
          title: c.title,
          slug: c.slug,
          cpd_points: c.cpd_points ?? null,
          img: c.img ?? null,
        };
        enrolledTmp.push({
          course_id: c.id,
          progress_pct: 0,
          title: c.title,
          slug: c.slug,
          img: c.img ?? null,
          cpd_points: c.cpd_points ?? null,
        });
      });

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

      // Purchased E-Books (paid only) + free-with-login e-books
      const { data: purRows } = await supabase
        .from("ebook_purchases")
        .select("ebook_id,status,ebooks!inner(id,slug,title,cover_url,price_cents)")
        .eq("user_id", userId)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (!guard()) return;

      const paidItems = ((purRows ?? []) as unknown as PurchaseRow[])
        .map((p) => {
          const e = pickEbook(p.ebooks);
          if (!e) return null;
          return {
            ebook_id: p.ebook_id,
            slug: e.slug,
            title: e.title,
            cover_url: e.cover_url ?? null,
            price_cedis: `GH₵ ${((e.price_cents ?? 0) / 100).toFixed(2)}`,
            access_label: "Purchased",
          } as PurchasedEbook;
        })
        .filter(Boolean) as PurchasedEbook[];

      const { data: freeRows } = await supabase
        .from("ebooks")
        .select("id,slug,title,cover_url,price_cents,free_for_logged_in")
        .eq("published", true)
        .eq("free_for_logged_in", true)
        .order("created_at", { ascending: false });
      if (!guard()) return;

      const freeItems = ((freeRows ?? []) as EbookRow[])
        .map((e) => ({
          ebook_id: e.id,
          slug: e.slug,
          title: e.title,
          cover_url: e.cover_url ?? null,
          price_cedis: "Free with login",
          access_label: "Free with login",
        })) as PurchasedEbook[];

      const mergedById = new Map<string, PurchasedEbook>();
      paidItems.forEach((item) => mergedById.set(item.ebook_id, item));
      freeItems.forEach((item) => {
        if (!mergedById.has(item.ebook_id)) mergedById.set(item.ebook_id, item);
      });
      setEbooks(Array.from(mergedById.values()));

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
  const verifyOrigin = "https://www.panavestkds.com";

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

  const BRAND = "#b65437";

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const totalCerts = (certs?.length ?? 0) + (provisionalCerts?.length ?? 0);
  const avgProgress =
    enrolled.length > 0
      ? Math.round(enrolled.reduce((s, c) => s + c.progress_pct, 0) / enrolled.length)
      : 0;

  const statCards = [
    {
      label: "Enrolled",
      value: enrolled.length,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 3 2 8l10 5 9-4.5V15h2V8L12 3zm0 13-6-3v4l6 3 6-3v-4l-6 3z" />
        </svg>
      ),
    },
    {
      label: "Avg Progress",
      value: `${avgProgress}%`,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M3 3h2v18H3V3zm16 18h2V9h-2v12zM11 21h2V13h-2v8zM7 21h2V7H7v14zM15 21h2V3h-2v18z" />
        </svg>
      ),
    },
    {
      label: "Certificates",
      value: totalCerts,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 1l3 6 6 .5-4.5 4 1.3 6.5L12 15l-5.8 3.9 1.3-6.5L3 7.5 9 7z" />
        </svg>
      ),
    },
    {
      label: "E-Books",
      value: ebooks.length,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm0 16h6a2 2 0 0 1 2 2H6a2 2 0 0 1-2-2zm10-16h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
        </svg>
      ),
    },
  ];

  if (!sessionReady) {
    return (
      <div className="bg-[color:var(--color-bg)] min-h-screen">
        <div className="bg-white border-b border-[color:var(--color-light)] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mx-auto max-w-screen-xl animate-pulse space-y-3">
            <div className="h-8 w-48 rounded-xl bg-[color:var(--color-light)]" />
            <div className="h-4 w-64 rounded-xl bg-[color:var(--color-light)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--color-bg)] min-h-screen">

      {/* ── Welcome header ── */}
      <div className="bg-white border-b border-[color:var(--color-light)]">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 2xl:px-20 py-7 2xl:py-9">
          <div className="flex flex-wrap items-start justify-between gap-4">

            {/* Left: avatar + name */}
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ background: BRAND }}
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--color-ink)] leading-tight">
                  {fullName ? `Welcome, ${fullName.split(" ")[0]}` : "Welcome"}
                </h1>
                {!isEditingName ? (
                  <p className="mt-0.5 text-sm text-[color:var(--color-muted)]">
                    Certificate name:{" "}
                    <span className="font-medium text-[color:var(--color-ink)]">{fullName || "Not set"}</span>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="underline decoration-dotted underline-offset-2 hover:text-[color:var(--color-ink)] transition"
                    >
                      {fullName ? "Edit" : "Add name"}
                    </button>
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      className="rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
                      placeholder="Your full name"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ background: BRAND }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditingName(false); setNameDraft(fullName); }}
                      className="rounded-lg border border-[color:var(--color-light)] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[color:var(--color-bg)] transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Settings */}
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-xl border border-[color:var(--color-light)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg)] transition shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1.08s.03.74.07 1.08l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.59z" />
              </svg>
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 2xl:px-20 py-8 2xl:py-12 space-y-10 2xl:space-y-14">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[color:var(--color-light)] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="text-2xl font-bold text-[color:var(--color-ink)]">{s.value}</div>
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(182,84,55,0.1)", color: BRAND }}
                >
                  {s.icon}
                </div>
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {loading && <PageSkeleton variant="dashboard" />}

        {!loading && (
          <>
            {/* ── Knowledge Programs ── */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>Learning</p>
                  <h2 className="mt-1 text-xl font-bold text-[color:var(--color-ink)]">My Knowledge Programs</h2>
                </div>
                <Link href="/courses" className="text-sm font-medium underline decoration-dotted underline-offset-4 text-[color:var(--color-ink)]/50 hover:text-[color:var(--color-ink)] transition">
                  Browse all
                </Link>
              </div>

              {enrolled.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--color-light)] bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(182,84,55,0.1)", color: BRAND }}>
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M12 3 2 8l10 5 9-4.5V15h2V8L12 3zm0 13-6-3v4l6 3 6-3v-4l-6 3z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[color:var(--color-ink)]">No programs enrolled yet</p>
                  <p className="mt-1 text-sm text-[color:var(--color-muted)]">Explore knowledge programs and start learning.</p>
                  <Link href="/courses" className="mt-4 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: BRAND }}>
                    Browse Knowledge
                  </Link>
                </div>
              ) : (
                <div className="grid gap-5 2xl:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {enrolled.map((c) => (
                    <div key={c.course_id} className="rounded-2xl border border-[color:var(--color-light)] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative w-full aspect-video bg-[color:var(--color-light)]/30">
                        <Image src={c.img || "/project-management.png"} alt={c.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                        {c.cpd_points != null && (
                          <div className="absolute top-2 left-2 rounded-md px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: BRAND }}>
                            CPPD {c.cpd_points}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-[15px] text-[color:var(--color-ink)] line-clamp-2 leading-snug">{c.title}</h3>
                        <div className="mt-3 space-y-1.5">
                          <div className="h-1.5 w-full rounded-full bg-[color:var(--color-light)]">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${c.progress_pct}%`, background: BRAND }}
                            />
                          </div>
                          <div className="text-xs text-[color:var(--color-muted)]">{Math.round(c.progress_pct)}% complete</div>
                        </div>
                        <Link
                          href={`/knowledge/${c.slug}/dashboard`}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                          style={{ background: BRAND }}
                        >
                          {c.progress_pct > 0 ? "Resume" : "Start"}
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Certificates ── */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>Credentials</p>
                  <h2 className="mt-1 text-xl font-bold text-[color:var(--color-ink)]">Certificates</h2>
                </div>
              </div>

              {totalCerts === 0 ? (
                <div className="rounded-2xl border border-[color:var(--color-light)] bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(182,84,55,0.1)", color: BRAND }}>
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M12 1l3 6 6 .5-4.5 4 1.3 6.5L12 15l-5.8 3.9 1.3-6.5L3 7.5 9 7z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[color:var(--color-ink)]">No certificates yet</p>
                  <p className="mt-1 text-sm text-[color:var(--color-muted)]">Complete a course and pass the final exam to earn your first certificate.</p>
                </div>
              ) : (
                <div className="grid gap-5 2xl:gap-8 sm:grid-cols-2">
                  {/* Real certificates */}
                  {certs.map((c) => {
                    const courseTitle = c.courses?.title ?? "Course";
                    const courseSlug = c.courses?.slug ?? "";
                    const bg = c.courses?.img ?? "/project-management.png";
                    const cpd = (c.courses?.cpd_points ?? null) as number | null;
                    const kdsCertId = makeKdsCertId(userId, c.course_id);
                    const verifyUrl = `${verifyOrigin}/verify?cert_id=${encodeURIComponent(c.id)}`;

                    return (
                      <div key={c.id} className="rounded-2xl border border-[color:var(--color-light)] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative w-full h-36">
                          <Image src={bg} alt={courseTitle} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <div className="font-semibold text-white text-[15px] line-clamp-1">{courseTitle}</div>
                          </div>
                          <div className="absolute top-3 right-3 rounded-md px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: BRAND }}>
                            Certified
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">Issued to</div>
                              <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{fullName || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">Issued</div>
                              <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{new Date(c.issued_at).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">Certificate No</div>
                              <div className="mt-0.5 font-mono text-[11px] text-[color:var(--color-ink)]">{c.certificate_no}</div>
                            </div>
                            {cpd != null && (
                              <div>
                                <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">CPPD</div>
                                <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{cpd}</div>
                              </div>
                            )}
                          </div>

                          <details className="rounded-xl border border-[color:var(--color-light)] overflow-hidden">
                            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-[color:var(--color-ink)] bg-[color:var(--color-bg)] hover:bg-[color:var(--color-light)]/40 transition select-none">
                              Preview certificate
                            </summary>
                            <div className="p-4">
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

                          <div className="flex flex-wrap items-center gap-2">
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
                              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                              style={{ background: BRAND }}
                            >
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                              </svg>
                              {downloadingCertId === c.id ? "Preparing…" : "Download PDF"}
                            </button>
                            {courseSlug && (
                              <Link href={`/knowledge/${courseSlug}/dashboard`} className="rounded-xl border border-[color:var(--color-light)] px-4 py-2 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg)] transition">
                                View course
                              </Link>
                            )}
                            {c.score_pct != null && (
                              <span className="ml-auto text-xs text-[color:var(--color-muted)]">Score: {c.score_pct}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Provisional certs */}
                  {provisionalCerts.map((pc) => {
                    const kdsCertId = makeKdsCertId(userId, pc.course_id);
                    return (
                      <div key={`provisional-${pc.course_id}`} className="rounded-2xl border border-[color:var(--color-light)] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative w-full h-36">
                          <Image src={pc.img ?? "/project-management.png"} alt={pc.course_title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-4 right-4">
                            <div className="font-semibold text-white text-[15px] line-clamp-1">{pc.course_title}</div>
                          </div>
                          <div className="absolute top-3 right-3 rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-500/90 text-white">
                            Provisional
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">Issued to</div>
                              <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{fullName || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">Passed</div>
                              <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{new Date(pc.passed_at).toLocaleDateString()}</div>
                            </div>
                            {pc.cpd_points != null && (
                              <div>
                                <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">CPPD</div>
                                <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{pc.cpd_points}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-[color:var(--color-muted)] uppercase tracking-wide text-[10px] font-semibold">Score</div>
                              <div className="mt-0.5 font-medium text-[color:var(--color-ink)]">{pc.score_pct}%</div>
                            </div>
                          </div>

                          <details className="rounded-xl border border-[color:var(--color-light)] overflow-hidden">
                            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-[color:var(--color-ink)] bg-[color:var(--color-bg)] hover:bg-[color:var(--color-light)]/40 transition select-none">
                              Preview (print / save)
                            </summary>
                            <div className="p-4">
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

                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                            Official PDF download will be available once the certificate is formally issued.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── E-Book Library ── */}
            <section>
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>Library</p>
                  <h2 className="mt-1 text-xl font-bold text-[color:var(--color-ink)]">E-Book Library</h2>
                </div>
                <Link href="/ebooks" className="text-sm font-medium underline decoration-dotted underline-offset-4 text-[color:var(--color-ink)]/50 hover:text-[color:var(--color-ink)] transition">
                  Browse all
                </Link>
              </div>

              {ebooks.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--color-light)] bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(182,84,55,0.1)", color: BRAND }}>
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                      <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm0 16h6a2 2 0 0 1 2 2H6a2 2 0 0 1-2-2zm10-16h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-[color:var(--color-ink)]">No e-books unlocked yet</p>
                  <p className="mt-1 text-sm text-[color:var(--color-muted)]">Purchase or unlock free e-books to access them here.</p>
                  <Link href="/ebooks" className="mt-4 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: BRAND }}>
                    Browse E-Books
                  </Link>
                </div>
              ) : (
                <div className="grid gap-5 2xl:gap-8 sm:grid-cols-2 lg:grid-cols-4">
                  {ebooks.map((b) => (
                    <div key={b.ebook_id} className="rounded-2xl border border-[color:var(--color-light)] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative w-full h-52 bg-[color:var(--color-light)]/30">
                        <Image src={b.cover_url || "/project-management.png"} alt={b.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 25vw" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-[14px] text-[color:var(--color-ink)] line-clamp-2 leading-snug">{b.title}</h3>
                        <div className="mt-1.5 text-xs text-[color:var(--color-muted)]">{b.access_label}</div>
                        <Link
                          href={`/ebooks/${b.slug}`}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                          style={{ background: BRAND }}
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                            <path d="M4 3h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V3zm10 0h6v16h-6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
                          </svg>
                          Read
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Quiz Results ── */}
            {Object.keys(quizByCourse).length > 0 && (
              <section>
                <div className="mb-5">
                  <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: BRAND }}>Assessments</p>
                  <h2 className="mt-1 text-xl font-bold text-[color:var(--color-ink)]">Quiz Results</h2>
                </div>

                <div className="space-y-4">
                  {Object.entries(quizByCourse).map(([courseId, rows]) => {
                    const meta = courseMetaMap[courseId];
                    const avgScore = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.attempt.score_pct, 0) / rows.length) : 0;
                    return (
                      <div key={courseId} className="rounded-2xl border border-[color:var(--color-light)] bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[color:var(--color-light)]">
                          <div>
                            <div className="font-semibold text-[color:var(--color-ink)]">{meta?.title ?? "Course"}</div>
                            <div className="mt-0.5 text-xs text-[color:var(--color-muted)]">{rows.length} chapter{rows.length !== 1 ? "s" : ""} · avg {avgScore}%</div>
                          </div>
                          {meta?.slug && (
                            <Link href={`/knowledge/${meta.slug}/dashboard`} className="flex-shrink-0 rounded-xl border border-[color:var(--color-light)] px-3 py-1.5 text-sm font-medium text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg)] transition">
                              Go to course
                            </Link>
                          )}
                        </div>
                        <ul className="divide-y divide-[color:var(--color-light)]">
                          {rows.map(({ attempt, chapter }) => (
                            <li
                              key={`${attempt.course_id}-${attempt.chapter_id}-${attempt.completed_at}`}
                              className="flex items-center justify-between gap-4 px-5 py-3"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-[color:var(--color-ink)] line-clamp-1">{chapter.title}</div>
                                <div className="text-xs text-[color:var(--color-muted)]">
                                  {attempt.correct_count}/{attempt.total_count} correct · {new Date(attempt.completed_at).toLocaleDateString()}
                                </div>
                              </div>
                              <span
                                className="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                                style={{ background: attempt.score_pct >= 70 ? "#059669" : attempt.score_pct >= 50 ? BRAND : "#dc2626" }}
                              >
                                {attempt.score_pct}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

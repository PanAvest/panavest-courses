"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProgressBar from "@/components/ProgressBar";

type Course = { id: string; slug: string; title: string; img: string | null };
type Chapter = { id: string; title: string; order_index: number; intro_video_url: string | null };
type Slide = {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  intro_video_url: string | null;
  asset_url: string | null;
  body: string | null;
  // legacy fields kept optional
  video_url?: string | null;
  content?: string | null;
};

export default function CourseDashboard() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>(""); // lightweight feedback
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // mobile sidebar

  // keep a snapshot of the current slide ids to avoid auto-resetting selection
  const slideIdsRef = useRef<string[]>([]);

  // auth
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? "");
    })();
  }, [router]);

  // load data
  useEffect(() => {
    if (!userId || !slug) return;
    (async () => {
      setLoading(true);

      // course
      const { data: c } = await supabase
        .from("courses")
        .select("id,slug,title,img")
        .eq("slug", String(slug))
        .maybeSingle();
      if (!c) { router.push("/knowledge"); return; }
      setCourse(c);

      // soft paywall: only redirect if row exists and paid is false
      try {
        const { data: enr } = await supabase
          .from("enrollments")
          .select("paid")
          .eq("user_id", userId).eq("course_id", c.id)
          .maybeSingle();
        if (enr && enr.paid === false) {
          router.push(`/knowledge/${c.slug}/enroll`);
          return;
        }
      } catch {/* ignore if table missing */}

      // chapters by order_index
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("id,title,order_index,intro_video_url")
        .eq("course_id", c.id)
        .order("order_index", { ascending: true });

      const chapterIds = (ch ?? []).map(x => x.id);

      // slides ordered within chapters (we’ll flatten to a single linear order)
      let sl: Slide[] = [];
      if (chapterIds.length > 0) {
        const { data: slData } = await supabase
          .from("course_slides")
          .select("id,chapter_id,title,order_index,intro_video_url,asset_url,body,video_url,content")
          .in("chapter_id", chapterIds)
          .order("order_index", { ascending: true });
        sl = slData ?? [];
      }

      setChapters(ch ?? []);
      setSlides(sl);

      // only auto-select on first load OR when the list of slide ids truly changes
      const newIds = sl.map(s => s.id);
      const prevIds = slideIdsRef.current;
      slideIdsRef.current = newIds;
      if (!activeSlide || prevIds.join(",") !== newIds.join(",")) {
        setActiveSlide(sl[0] ?? null);
      }

      // progress (best-effort)
      try {
        const { data: prog } = await supabase
          .from("user_slide_progress")
          .select("slide_id")
          .eq("user_id", userId)
          .eq("course_id", c.id);
        setCompleted((prog ?? []).map((p: { slide_id: string }) => p.slide_id));
      } catch {/* ignore if table missing */}

      setLoading(false);
    })();
  }, [userId, slug]); // note: no router or activeSlide here

  // Build a single linear ordering for all slides: chapter.order_index then slide.order_index
  const orderedSlides = useMemo(() => {
    const chOrder: Record<string, number> = {};
    chapters.forEach(ch => { chOrder[ch.id] = ch.order_index ?? 0; });
    const sorted = [...slides].sort((a, b) => {
      const ca = chOrder[a.chapter_id] ?? 0;
      const cb = chOrder[b.chapter_id] ?? 0;
      if (ca !== cb) return ca - cb;
      return (a.order_index ?? 0) - (b.order_index ?? 0);
    });
    return sorted;
  }, [chapters, slides]);

  const orderedIds = useMemo(() => orderedSlides.map(s => s.id), [orderedSlides]);

  // Determine the highest slide index the user may access:
  // you can open up to the first incomplete slide (inclusive).
  const firstIncompleteIndex = useMemo(() => {
    for (let i = 0; i < orderedIds.length; i++) {
      if (!completed.includes(orderedIds[i])) return i;
    }
    return orderedIds.length - 1; // all done: allow all
  }, [orderedIds, completed]);

  const canAccessById = useCallback((slideId: string) => {
    const idx = orderedIds.indexOf(slideId);
    if (idx === -1) return false;
    return idx <= firstIncompleteIndex;
  }, [orderedIds, firstIncompleteIndex]);

  const totalSlides = orderedSlides.length;
  const done = completed.length;
  const pct = totalSlides === 0 ? 0 : Math.round((done / totalSlides) * 100);

  async function markDone(slide: Slide | null) {
    if (!slide || !userId || !course) return;
    try {
      await supabase
        .from("user_slide_progress")
        .upsert(
          { user_id: userId, course_id: course.id, slide_id: slide.id },
          { onConflict: "user_id,slide_id" }
        );
      setCompleted(prev => (prev.includes(slide.id) ? prev : [...prev, slide.id]));
      setNotice("Marked as done ✓");
      // auto-advance to next slide if exists
      const idx = orderedIds.indexOf(slide.id);
      if (idx > -1 && idx + 1 < orderedIds.length) {
        const next = orderedSlides[idx + 1];
        setActiveSlide(next);
        // On mobile, keep the content in view
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setTimeout(() => setNotice(""), 1500);
    } catch {
      setNotice("Could not save progress. Try again.");
      setTimeout(() => setNotice(""), 2000);
    }
  }

  const slidesByChapter = useMemo(() => {
    const map: Record<string, Slide[]> = {};
    for (const s of orderedSlides) (map[s.chapter_id] ||= []).push(s);
    return map;
  }, [orderedSlides]);

  function renderMedia(s: Slide) {
    const video = s.video_url ?? s.intro_video_url ?? null;
    if (video) {
      // make video fully responsive & never overlay text
      return (
        <div className="mt-3 w-full">
          <div className="w-full overflow-hidden rounded-lg">
            <video
              className="block w-full h-auto"
              controls
              preload="metadata"
              src={video}
            />
          </div>
        </div>
      );
    }
    if (s.asset_url) {
      const lower = s.asset_url.toLowerCase();
      const isImg = [".jpg",".jpeg",".png",".gif",".webp"].some(ext => lower.endsWith(ext));
      if (isImg) {
        return (
          <div className="mt-3">
            <Image
              src={s.asset_url}
              alt="Slide asset"
              width={1600}
              height={900}
              className="rounded-lg ring-1 ring-[color:var(--color-light)] w-full h-auto object-contain"
            />
          </div>
        );
      }
      return (
        <div className="mt-3 text-sm">
          <a className="underline break-all" href={s.asset_url} target="_blank" rel="noreferrer">
            Open slide asset
          </a>
        </div>
      );
    }
    return null;
  }

  const trySelectSlide = (s: Slide) => {
    if (canAccessById(s.id)) {
      setActiveSlide(s);
      setMobileNavOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setNotice("Complete the previous slide first.");
      setTimeout(() => setNotice(""), 1500);
    }
  };

  const activeIndex = activeSlide ? orderedIds.indexOf(activeSlide.id) : -1;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex > -1 && activeIndex + 1 <= firstIncompleteIndex;

  if (loading) return <div className="mx-auto max-w-screen-lg px-4 py-10">Loading…</div>;
  if (!course) return <div className="mx-auto max-w-screen-lg px-4 py-10">Not found.</div>;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-6">
      {/* Header row: course + user email + mobile toggle */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xl md:text-2xl font-semibold">{course.title}</div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted">
          {userEmail && <span className="truncate max-w-[50vw] md:max-w-none">{userEmail}</span>}
          <button
            type="button"
            className="md:hidden rounded-lg border px-3 py-1.5"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-expanded={mobileNavOpen}
            aria-controls="course-sidebar"
          >
            {mobileNavOpen ? "Hide Menu" : "Show Menu"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside
          id="course-sidebar"
          className={[
            "rounded-2xl bg-white border border-light p-4 h-max lg:sticky lg:top-4",
            "md:max-h-[80vh] md:overflow-auto",
            mobileNavOpen ? "block" : "hidden md:block"
          ].join(" ")}
        >
          <div className="text-sm">Progress</div>
          <div className="mt-1"><ProgressBar value={pct} /></div>
          <div className="mt-1 text-xs text-muted">{done} / {totalSlides} slides completed</div>

          <div className="mt-4">
            {chapters.map((ch) => (
              <div key={ch.id} className="mb-3">
                <div className="font-semibold text-sm">{ch.title}</div>
                <ul className="mt-2 grid gap-1">
                  {(slidesByChapter[ch.id] ?? []).map((s) => {
                    const isActive = activeSlide?.id === s.id;
                    const isDone = completed.includes(s.id);
                    const isLocked = !canAccessById(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={isLocked}
                          className={[
                            "w-full text-left text-xs px-2 py-1.5 rounded-md",
                            isActive ? "bg-[color:var(--color-light)]" : "hover:bg-[color:var(--color-light)]/70",
                            isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          ].join(" ")}
                          onClick={() => trySelectSlide(s)}
                          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isLocked) trySelectSlide(s); }}
                          aria-disabled={isLocked}
                        >
                          {isDone ? "✅ " : (isLocked ? "🔒 " : "")}{s.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {chapters.length === 0 && <div className="text-sm text-muted">No content yet.</div>}
          </div>
        </aside>

        {/* Main */}
        <main className="rounded-2xl bg-white border border-light p-4">
          {activeSlide ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="text-base md:text-lg font-semibold">{activeSlide.title}</div>
                {/* Prev/Next controls with locking */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (canGoPrev) setActiveSlide(orderedSlides[activeIndex - 1]); }}
                    disabled={!canGoPrev}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${canGoPrev ? "hover:bg-[color:var(--color-light)]/70" : "opacity-50 cursor-not-allowed"}`}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (canGoNext) setActiveSlide(orderedSlides[activeIndex + 1]); else setNotice("Complete this slide first."); }}
                    disabled={!canGoNext}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${canGoNext ? "hover:bg-[color:var(--color-light)]/70" : "opacity-50 cursor-not-allowed"}`}
                  >
                    Next
                  </button>
                </div>
              </div>

              {renderMedia(activeSlide)}

              {(activeSlide.body ?? activeSlide.content) && (
                <div className="prose max-w-none mt-4 text-sm whitespace-pre-wrap">
                  {activeSlide.body ?? activeSlide.content}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => markDone(activeSlide)}
                  className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90"
                >
                  Mark as Done
                </button>
              </div>

              {!!notice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-3 text-xs md:text-sm text-[#0a1156]"
                >
                  {notice}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted">Select a slide to begin.</div>
          )}
        </main>
      </div>
    </div>
  );
}

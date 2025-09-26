"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);

  // keep a snapshot of the current slide ids to avoid auto-resetting selection
  const slideIdsRef = useRef<string[]>([]);

  // auth
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/sign-in"); return; }
      setUserId(user.id);
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

      // chapters by order_index (fallback to position if needed)
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("id,title,order_index,intro_video_url")
        .eq("course_id", c.id)
        .order("order_index", { ascending: true });

      const chapterIds = (ch ?? []).map(x => x.id);

      // slides
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

  const totalSlides = slides.length;
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
    } catch {/* ignore if table missing */}
  }

  const slidesByChapter = useMemo(() => {
    const map: Record<string, Slide[]> = {};
    for (const s of slides) (map[s.chapter_id] ||= []).push(s);
    return map;
  }, [slides]);

  function renderMedia(s: Slide) {
    const video = s.video_url ?? s.intro_video_url ?? null;
    if (video) {
      return <video className="mt-3 w-full rounded-lg" controls preload="metadata" src={video} />;
    }
    if (s.asset_url) {
      const lower = s.asset_url.toLowerCase();
      const isImg = lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif") || lower.endsWith(".webp");
      if (isImg) {
        return (
          <div className="mt-3">
            <Image
              src={s.asset_url}
              alt="Slide asset"
              width={1280}
              height={720}
              className="rounded-lg ring-1 ring-[color:var(--color-light)] w-full h-auto"
            />
          </div>
        );
      }
      return (
        <div className="mt-3 text-sm">
          <a className="underline" href={s.asset_url} target="_blank" rel="noreferrer">Open slide asset</a>
        </div>
      );
    }
    return null;
  }

  if (loading) return <div className="mx-auto max-w-screen-lg px-4 py-10">Loading…</div>;
  if (!course) return <div className="mx-auto max-w-screen-lg px-4 py-10">Not found.</div>;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 md:px-6 py-8 grid gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl bg-white border border-light p-4 h-max sticky top-4">
        <div className="text-xl font-semibold">{course.title}</div>
        <div className="mt-3 text-sm">Progress</div>
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
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`pointer-events-auto cursor-pointer w-full text-left text-xs px-2 py-1.5 rounded-md ${isActive ? "bg-[color:var(--color-light)]" : "hover:bg-[color:var(--color-light)]/70"}`}
                        onClick={() => setActiveSlide(s)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveSlide(s); }}
                      >
                        {isDone ? "✅ " : ""}{s.title}
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

      <main className="rounded-2xl bg-white border border-light p-4">
        {activeSlide ? (
          <>
            <div className="text-lg font-semibold">{activeSlide.title}</div>
            {renderMedia(activeSlide)}
            {(activeSlide.body ?? activeSlide.content) && (
              <div className="prose max-w-none mt-4 text-sm whitespace-pre-wrap">
                {activeSlide.body ?? activeSlide.content}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => markDone(activeSlide)}
                className="pointer-events-auto rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:opacity-90"
              >
                Mark as Done
              </button>
            </div>
          </>
        ) : (
          <div className="text-muted">Select a slide to begin.</div>
        )}
      </main>
    </div>
  );
}

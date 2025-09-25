"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  img: string | null;
  cpd_points: number | null;
};

type EnrollmentRow = {
  course_id: string;
  progress_pct: number | null;
  courses?: CourseRow | CourseRow[] | null;
};

type EnrolledCourse = {
  course_id: string;
  progress_pct: number;
  title: string;
  slug: string;
  img: string | null;
  cpd_points: number | null;
};

type AssessmentJoined = {
  id: string;
  title: string;
  due_at: string | null;
  status: "due" | "submitted" | "graded" | null;
  course_slug: string;
  course_title: string;
};

function pickCourse(c: CourseRow | CourseRow[] | null | undefined): CourseRow | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

export default function DashboardPage() {
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [due, setDue] = useState<AssessmentJoined[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/auth/sign-in";
        return;
      }

      // Enrollments (joined with courses)
      const { data: enrData, error: enrErr } = await supabase
        .from("enrollments")
        .select("course_id, progress_pct, courses!inner(title,slug,img,cpd_points)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!enrErr) {
        const rows = (enrData ?? []) as EnrollmentRow[];
        const mapped: EnrolledCourse[] = rows.map((r) => {
          const c = pickCourse(r.courses) || {
            id: "",
            slug: "",
            title: "",
            img: null,
            cpd_points: null,
          };
          const pct = Number.isFinite(Number(r.progress_pct)) ? Number(r.progress_pct) : 0;
          return {
            course_id: r.course_id,
            progress_pct: Math.max(0, Math.min(100, pct)),
            title: c.title,
            slug: c.slug,
            img: c.img ?? null,
            cpd_points: c.cpd_points ?? null,
          };
        });
        setEnrolled(mapped);
      }

      // Upcoming assessments (via a view if available)
      // Cast table name to string to satisfy TS even if not in generated types.
      const { data: dueRows } = await supabase
        .from("assessments_due_view" as unknown as string)
        .select("id,title,due_at,status,course_slug,course_title")
        .eq("user_id", user.id)
        .limit(5);

      setDue(((dueRows ?? []) as AssessmentJoined[]));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-screen-lg px-4 md:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold">Your Dashboard</h1>

      {loading && <p className="mt-4 text-muted">Loading…</p>}

      {!loading && (
        <>
          {/* Continue learning */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Continue learning</h2>
            {enrolled.length === 0 ? (
              <div className="mt-3 rounded-xl border border-light bg-white p-4">
                <p className="text-muted">You haven’t enrolled yet.</p>
                <Link href="/courses" className="mt-2 inline-block rounded-lg bg-brand px-4 py-2 text-white">
                  Browse knowledge
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {enrolled.map((c) => (
                  <div key={c.course_id} className="rounded-xl border border-light bg-white overflow-hidden">
                    <div className="relative w-full h-40">
                      <Image
                        src={c.img || "/project-management.png"}
                        alt={c.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <div className="p-4">
                      <div className="font-semibold line-clamp-1">{c.title}</div>
                      <div className="mt-2 h-2 w-full bg-[color:var(--color-light)] rounded">
                        <div
                          className="h-2 bg-brand rounded"
                          style={{ width: `${c.progress_pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-muted">{Math.round(c.progress_pct)}% complete</div>
                      <Link href={`/courses/${c.slug}`} className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 text-white">
                        Resume
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming assessments */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Upcoming assessments</h2>
            {due.length === 0 ? (
              <p className="mt-3 text-muted">No upcoming deadlines.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {due.map((a) => (
                  <li key={a.id} className="rounded-xl border border-light bg-white p-4">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-muted">
                      {a.course_title} · {a.due_at ? new Date(a.due_at).toLocaleDateString() : "No due date"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

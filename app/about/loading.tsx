const BRAND = "#b65437";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded bg-white/15 ${className}`} />;
}

function LightSkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded bg-[color:var(--color-light)] ${className}`} />;
}

export default function AboutLoading() {
  return (
    <div aria-busy="true" aria-label="Loading about page" className="animate-pulse">
      <section className="animate-fade-up relative overflow-hidden bg-[color:var(--color-ink)]">
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <div className="relative mx-auto max-w-screen-2xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="h-8 w-64 max-w-full rounded-full border border-white/15 bg-white/10" />
          <div className="mt-6 space-y-3">
            <SkeletonBlock className="h-12 w-full max-w-[620px] sm:h-16" />
            <SkeletonBlock className="h-12 w-full max-w-[520px] sm:h-16" />
          </div>
          <div className="mt-6 max-w-2xl space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-11/12" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-fade-up bg-white/5 px-6 py-5"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <SkeletonBlock className="mx-auto h-7 w-16" />
                <SkeletonBlock className="mx-auto mt-3 h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="animate-fade-up bg-white py-16 sm:py-24" style={{ animationDelay: "90ms" }}>
        <div className="mx-auto grid max-w-screen-2xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="animate-fade-up" style={{ animationDelay: "130ms" }}>
            <LightSkeletonBlock className="h-4 w-28" />
            <div className="mt-4 space-y-3">
              <LightSkeletonBlock className="h-8 w-full max-w-lg" />
              <LightSkeletonBlock className="h-8 w-4/5 max-w-md" />
            </div>
            <div className="mt-6 space-y-3">
              <LightSkeletonBlock className="h-4 w-full max-w-xl" />
              <LightSkeletonBlock className="h-4 w-11/12 max-w-xl" />
              <LightSkeletonBlock className="h-4 w-5/6 max-w-xl" />
              <LightSkeletonBlock className="h-4 w-3/4 max-w-xl" />
            </div>
            <div className="mt-7 h-12 w-56 rounded-xl" style={{ background: BRAND }} />
          </div>

          <div
            className="animate-fade-up rounded-2xl p-8 sm:p-10"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #8b3d25)`, animationDelay: "180ms" }}
          >
            <SkeletonBlock className="h-16 w-16" />
            <div className="mt-8 space-y-3">
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-5 w-4/5" />
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/20" />
              <SkeletonBlock className="h-4 w-40" />
            </div>
          </div>
        </div>
      </section>

      <section className="animate-fade-up bg-[color:var(--color-bg)] py-16 sm:py-24" style={{ animationDelay: "160ms" }}>
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl space-y-4">
            <LightSkeletonBlock className="mx-auto h-4 w-28" />
            <LightSkeletonBlock className="mx-auto h-9 w-64" />
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="animate-fade-up rounded-2xl border border-[color:var(--color-light)] bg-white p-8 shadow-sm"
                style={{ animationDelay: `${220 + index * 70}ms` }}
              >
                <div className="h-12 w-12 rounded-xl" style={{ background: BRAND }} />
                <LightSkeletonBlock className="mt-6 h-5 w-32" />
                <div className="mt-4 space-y-3">
                  <LightSkeletonBlock className="h-4 w-full" />
                  <LightSkeletonBlock className="h-4 w-11/12" />
                  <LightSkeletonBlock className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

type PageSkeletonProps = {
  variant?: "default" | "narrow" | "dashboard";
};

export default function PageSkeleton({ variant = "default" }: PageSkeletonProps) {
  const maxWidth =
    variant === "narrow" ? "max-w-md" : variant === "dashboard" ? "max-w-screen-2xl" : "max-w-screen-lg";

  return (
    <div className={`mx-auto w-full ${maxWidth} px-4 sm:px-6 lg:px-8 py-10`} aria-busy="true" aria-label="Loading page">
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-28 rounded bg-[color:var(--color-light)]" />
          <div className="h-8 w-2/3 max-w-xl rounded bg-[color:var(--color-light)]" />
          <div className="h-4 w-full max-w-2xl rounded bg-[color:var(--color-light)]/80" />
        </div>

        <div className={variant === "dashboard" ? "grid gap-4 md:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
          {Array.from({ length: variant === "narrow" ? 1 : 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-[color:var(--color-light)]/50 bg-white p-4 shadow-sm">
              <div className="h-32 rounded-lg bg-[color:var(--color-light)]/70" />
              <div className="mt-4 h-4 w-3/4 rounded bg-[color:var(--color-light)]" />
              <div className="mt-3 h-3 w-full rounded bg-[color:var(--color-light)]/80" />
              <div className="mt-2 h-3 w-5/6 rounded bg-[color:var(--color-light)]/70" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[color:var(--color-light)]/50 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-[color:var(--color-light)]" />
            <div className="h-3 w-full rounded bg-[color:var(--color-light)]/80" />
            <div className="h-3 w-11/12 rounded bg-[color:var(--color-light)]/70" />
            <div className="h-3 w-4/5 rounded bg-[color:var(--color-light)]/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

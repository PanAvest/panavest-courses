"use client";
export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full h-3 rounded-full bg-[color:var(--color-light)] overflow-hidden" aria-label="Progress">
      <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Decorative pattern layer for dark sections: soft brand glows, a fine gold dot grid,
// and faint orbit rings that echo the hero globe. Purely presentational (server-safe).
// Usage: put on a `relative isolate overflow-hidden` section and keep the content above
// with `relative z-10`. Pass grid={false} over photos so the dot grid doesn't clash.
export default function DarkDecor({ grid = true }: { grid?: boolean }) {
  const layers = [
    "radial-gradient(55rem 38rem at 88% 4%, rgba(182,84,55,0.22), transparent 60%)",
    "radial-gradient(48rem 40rem at 8% 106%, rgba(245,183,80,0.13), transparent 55%)",
  ];
  if (grid) layers.push("radial-gradient(rgba(245,183,80,0.07) 1px, transparent 1.4px)");

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: layers.join(","),
          backgroundSize: grid ? "100% 100%, 100% 100%, 24px 24px" : "100% 100%, 100% 100%",
        }}
      />
      {/* orbit rings bleeding in from the top-right */}
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        fill="none"
        stroke="#d9ad47"
        className="pointer-events-none absolute -right-28 -top-32 h-[26rem] w-[26rem] opacity-20 sm:h-[32rem] sm:w-[32rem]"
      >
        <circle cx="200" cy="200" r="196" strokeWidth="1" strokeDasharray="3 9" />
        <circle cx="200" cy="200" r="150" strokeWidth="1" opacity="0.85" />
        <circle cx="200" cy="200" r="104" strokeWidth="1" strokeDasharray="2 7" />
        <circle cx="200" cy="6" r="4" fill="#f5b750" stroke="none" />
        <circle cx="350" cy="272" r="3.5" fill="#b65437" stroke="none" />
        <circle cx="66" cy="120" r="3" fill="#d9ad47" stroke="none" />
      </svg>
      {/* smaller ring set bleeding in from the bottom-left */}
      <svg
        aria-hidden
        viewBox="0 0 300 300"
        fill="none"
        stroke="#d9ad47"
        className="pointer-events-none absolute -bottom-24 -left-24 h-[18rem] w-[18rem] opacity-[0.14] sm:h-[22rem] sm:w-[22rem]"
      >
        <circle cx="150" cy="150" r="146" strokeWidth="1" strokeDasharray="2 8" />
        <circle cx="150" cy="150" r="100" strokeWidth="1" />
        <circle cx="150" cy="4" r="3.5" fill="#f5b750" stroke="none" />
      </svg>
    </>
  );
}

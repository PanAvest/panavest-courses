 "use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  title?: string;
  className?: string;
};

/**
 * InteractivePlayer wraps an iframe with a first-click overlay to unlock autoplay.
 * It avoids touching Storyline JS and only ensures we get a user gesture up front.
 */
export default function InteractivePlayer({ src, title = "Interactive course player", className = "" }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [needsTap, setNeedsTap] = useState(true);

  useEffect(() => {
    // If the browser restores state and already interacted, skip overlay
    const timer = window.setTimeout(() => setNeedsTap((prev) => prev), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleTap = () => {
    setNeedsTap(false);
    try {
      iframeRef.current?.focus();
      iframeRef.current?.contentWindow?.postMessage({ type: "kds-interactive-start" }, "*");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border border-light bg-black aspect-[16/9] ${className}`}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        allow="autoplay; fullscreen"
        className="absolute inset-0 h-full w-full"
      />
      {needsTap && (
        <button
          type="button"
          onClick={handleTap}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white text-sm md:text-base font-semibold"
        >
          Tap to start the interactive course
        </button>
      )}
    </div>
  );
}

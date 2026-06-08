"use client";

import { usePathname } from "next/navigation";

export default function FooterConditional({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/auth")) return null;
  return <>{children}</>;
}

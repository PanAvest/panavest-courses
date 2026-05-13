"use client";

import { useEffect } from "react";

export default function RecoveryRedirect() {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = query.get("type") || hash.get("type");

    if (type !== "recovery") return;

    const target = `/auth/reset/confirm${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  return null;
}

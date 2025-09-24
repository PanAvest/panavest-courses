"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setEmail(user.email ?? null);
      }
      setChecking(false);
    })();
  }, [router]);

  if (checking) return <div className="px-4 py-16">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-white/80">Signed in as {email}</p>
    </div>
  );
}

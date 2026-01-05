"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { COUNTRIES } from "@/lib/countries";
import { educationOptions } from "@/lib/profileConstants";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selectedCountry = useMemo(() => COUNTRIES.find((c) => c.code === country), [country]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        router.replace("/auth/sign-in");
        return;
      }

      const user = sessionData.session.user;
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, age, date_of_birth, highest_education, country_code")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      setFullName((profile?.full_name as string | null) ?? user.user_metadata.full_name ?? "");
      const dobMeta = (user.user_metadata as Record<string, unknown>)?.date_of_birth;
      const profileDob = (profile as Record<string, unknown> | null)?.["date_of_birth"] as string | null;
      setDob(profileDob ?? (typeof dobMeta === "string" ? dobMeta : ""));
      setEducation((profile?.highest_education as string | null) ?? user.user_metadata.highest_education ?? "");
      setCountry((profile?.country_code as string | null) ?? user.user_metadata.country_code ?? "");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const validationError = validateProfile({ fullName, dob, education, country });
    if (validationError) {
      setErr(validationError);
      return;
    }

    setBusy(true);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      setErr("Please sign in again.");
      setBusy(false);
      router.replace("/auth/sign-in");
      return;
    }

    try {
      const user = sessionData.session.user;
    const ageVal = calcAgeFromDob(dob);
    const profilePayload = {
      id: user.id,
      full_name: fullName.trim(),
      age: ageVal,
      date_of_birth: dob,
      highest_education: education,
      country_code: country,
      country_name: selectedCountry?.name ?? "",
      };

      // Update auth metadata (triggers will sync profile too)
      const { error: metaErr } = await supabase.auth.updateUser({
        data: profilePayload,
      });
      if (metaErr) throw metaErr;

      // Ensure profile row is up to date
      const { error: profErr } = await supabase.from("profiles").upsert(profilePayload);
      if (profErr) throw profErr;

      setMsg("Profile saved. You can continue.");
      router.replace("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center text-[color:var(--color-text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 ring-1 ring-[color:var(--color-light)]">
        <h1 className="text-2xl font-semibold">Complete your profile</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
          We use this information to personalize your PanAvest experience.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-xl bg-[color:var(--color-light)]/60 px-3 py-2 ring-1 ring-[color:var(--color-light)] text-[color:var(--color-text-muted)]"
            />
          </label>

          <label className="block">
            <span className="text-sm">Full name</span>
            <input
              type="text"
              autoComplete="name"
              className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              placeholder="Ama Mensah"
            />
          </label>

          <label className="block">
            <span className="text-sm">Date of birth</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
              value={dob}
              onChange={(ev) => setDob(ev.target.value)}
            />
          </label>

          <fieldset className="mt-1 rounded-xl border border-[color:var(--color-light)] bg-[color:var(--color-light)]/40 px-3 py-3">
            <legend className="px-1 text-sm font-medium">Highest educational qualification</legend>
            <div className="mt-2 grid gap-2">
              {educationOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="education"
                    value={option}
                    checked={education === option}
                    onChange={(ev) => setEducation(ev.target.value)}
                    className="h-4 w-4 accent-[color:var(--color-brand)]"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm">Country</span>
            <select
              name="country"
              autoComplete="country-name"
              className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
              value={country}
              onChange={(ev) => setCountry(ev.target.value)}
            >
              <option value="">Select your country</option>
              {COUNTRIES.map(({ code, name, flag }) => (
                <option key={code} value={code}>
                  {flag} {name}
                </option>
              ))}
            </select>
          </label>

          {err && <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-xl border border-[color:var(--color-light)] px-4 py-2 font-semibold text-[color:var(--color-brand)] hover:bg-[color:var(--color-light)]/60 sm:w-auto"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function validateProfile(data: { fullName: string; dob: string; education: string; country: string }) {
  if (!data.fullName.trim()) return "Full name is required.";
  if (!data.dob.trim()) return "Date of birth is required.";
  if (!isOldEnough(data.dob, 13)) return "You must be at least 13 years old.";
  if (!data.education) return "Select your highest educational qualification.";
  if (!data.country) return "Select your country.";
  return null;
}

function isOldEnough(dob: string, minYears: number) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const age =
    today.getFullYear() -
    d.getFullYear() -
    (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age >= minYears;
}

function calcAgeFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  return (
    today.getFullYear() -
    d.getFullYear() -
    (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
  );
}

"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { COUNTRIES } from "@/lib/countries";

type Mode = "sign-in" | "sign-up";

type PasswordCheck = {
  label: "Weak" | "Strong" | "Very strong";
  issues: string[];
};

const educationOptions = [
  "Junior High School (JHS)",
  "Senior High School (SHS)",
  "Technical and Vocational Education and Training (TVET)",
  "Teacher Education Colleges",
  "Nursing and Health Training Colleges",
  "Tertiary Education",
  "Diploma",
  "Higher National Diploma (HND)",
  "Bachelor’s Degree",
  "Postgraduate Diploma",
  "Master’s Degree",
  "Doctorate (PhD)",
];

// Create the client only in the browser to avoid SSR issues
const supabase: SupabaseClient | null = typeof window !== "undefined" ? getSupabaseClient() : null;

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  // Sign-up only fields
  const [fullName, setFullName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [education, setEducation] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const title = mode === "sign-in" ? "Sign In" : "Create Account";
  const cta = mode === "sign-in" ? "Sign In" : "Sign Up";

  const normalizedEmail = email.trim();
  const passwordStrength: PasswordCheck = useMemo(() => {
    return evaluatePassword(password, normalizedEmail, fullName);
  }, [password, normalizedEmail, fullName]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);

    if (!supabase) {
      setErr("Client not ready. Refresh the page and try again.");
      setBusy(false);
      return;
    }

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const validationError = validateSignUp({
          fullName,
          age,
          education,
          country,
          password,
          confirmPassword,
          passwordStrength,
        });
        if (validationError) {
          setErr(validationError);
          return;
        }

        const selectedCountry = COUNTRIES.find((c) => c.code === country);

        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/sign-in`,
            data: {
              full_name: fullName.trim(),
              age: Number(age),
              highest_education: education,
              country_code: country,
              country_name: selectedCountry?.name ?? "",
            },
          },
        });
        if (error) throw error;
        setMsg("Account created. Check your email to verify, then sign in.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-[var(--color-light)]">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
        {mode === "sign-in" ? "Welcome back!" : "Start your PanAvest journey."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "sign-up" && (
          <>
            <label className="block">
              <span className="text-sm">Full name</span>
              <input
                type="text"
                autoComplete="name"
                required
                className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                placeholder="Ama Mensah"
              />
            </label>

            <label className="block">
              <span className="text-sm">Age</span>
              <input
                type="number"
                inputMode="numeric"
                min={13}
                max={110}
                required
                className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
                value={age}
                onChange={(ev) => setAge(ev.target.value)}
                placeholder="25"
              />
            </label>

            <fieldset className="rounded-xl border border-[color:var(--color-light)] bg-[color:var(--color-light)]/40 px-3 py-3">
              <legend className="px-1 text-sm font-medium">Highest educational qualification</legend>
              <div className="mt-2 grid gap-2">
                {educationOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="education"
                      required
                      value={option}
                      checked={education === option}
                      onChange={(ev) => setEducation(ev.target.value)}
                      className="h-4 w-4 accent-[color:var(--color-brand)]"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                Doctorate (PhD) is optional—select the level that best fits you.
              </p>
            </fieldset>

            <label className="block">
              <span className="text-sm">Country</span>
              <select
                required
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
          </>
        )}

        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={12}
            className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="Use 12+ characters"
          />
          {mode === "sign-in" && (
            <div className="mt-2 text-right text-xs text-[color:var(--color-text-muted)]">
              <a href="/auth/reset" className="underline hover:text-[color:var(--color-brand)]">Forgot password?</a>
            </div>
          )}
        </label>

        {mode === "sign-up" && (
          <>
            <label className="block">
              <span className="text-sm">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 w-full rounded-xl bg-[color:var(--color-light)]/40 px-3 py-2 ring-1 ring-[color:var(--color-light)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-brand)]/40"
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                placeholder="Re-enter password"
              />
            </label>

            <PasswordRules strength={passwordStrength} />
          </>
        )}

        {err && <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Please wait..." : cta}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-[color:var(--color-text-muted)]">
        {mode === "sign-in" ? (
          <>Don&apos;t have an account? <a href="/auth/sign-up" className="underline">Sign up</a></>
        ) : (
          <>Already have an account? <a href="/auth/sign-in" className="underline">Sign in</a></>
        )}
      </div>
    </div>
  );
}

function validateSignUp({
  fullName,
  age,
  education,
  country,
  password,
  confirmPassword,
  passwordStrength,
}: {
  fullName: string;
  age: string;
  education: string;
  country: string;
  password: string;
  confirmPassword: string;
  passwordStrength: PasswordCheck;
}) {
  if (!fullName.trim()) return "Full name is required.";

  const ageNumber = Number(age);
  if (!Number.isFinite(ageNumber) || ageNumber < 13) return "Enter a valid age (13+).";

  if (!education) return "Select your highest educational qualification.";
  if (!country) return "Select your country.";

  if (passwordStrength.issues.length > 0) {
    return `Update your password to meet our strength rules: ${passwordStrength.issues.join("; ")}`;
  }

  if (confirmPassword !== password) return "Passwords do not match.";

  return null;
}

function evaluatePassword(password: string, email: string, fullName: string): PasswordCheck {
  const issues: string[] = [];

  if (!password) {
    return {
      label: "Weak",
      issues: [
        "Use at least 12 characters",
        "Mix uppercase, lowercase, numbers, and special symbols",
        "Avoid names, email, or common words",
        "Avoid repeats or easy sequences like 123456 or qwerty",
      ],
    };
  }

  const lower = password.toLowerCase();
  const localEmail = email.split("@")[0]?.toLowerCase() ?? "";
  const nameParts = fullName.toLowerCase().split(/\s+/).filter(Boolean);
  const specialCharPattern = /[!@#$%^&*()[\]{};:'"\\|,.<>/?`~_\-+=]/;
  const commonWords = ["password", "passw0rd", "admin", "welcome", "letmein", "iloveyou", "qwerty"];

  if (password.length < 12) issues.push("Use at least 12 characters (minimum 8)");
  if (!/[A-Z]/.test(password)) issues.push("Add uppercase letters (A–Z)");
  if (!/[a-z]/.test(password)) issues.push("Add lowercase letters (a–z)");
  if (!/[0-9]/.test(password)) issues.push("Include numbers (0–9)");
  if (!specialCharPattern.test(password)) issues.push("Include special characters (! @ # $ % ^ & *)");
  if (/^(.)\1+$/.test(password)) issues.push("Avoid repeating a single character");
  if (hasSequentialPattern(password)) issues.push("Avoid predictable sequences (123456, abcdef)");

  if (nameParts.some((part) => part.length > 2 && lower.includes(part))) {
    issues.push("Remove personal info such as your name");
  }
  if (localEmail && lower.includes(localEmail)) {
    issues.push("Do not reuse your email in the password");
  }
  if (commonWords.some((word) => lower.includes(word))) {
    issues.push("Avoid common words or keyboard patterns");
  }

  const strongEnough = issues.length === 0;
  const label: PasswordCheck["label"] =
    strongEnough && password.length >= 16 ? "Very strong" : strongEnough ? "Strong" : "Weak";

  return { label, issues };
}

function hasSequentialPattern(password: string) {
  const sequences = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiopasdfghjklzxcvbnm"];
  const lower = password.toLowerCase();

  return sequences.some((seq) => {
    for (let i = 0; i < seq.length - 2; i += 1) {
      const slice = seq.slice(i, i + 3);
      if (lower.includes(slice)) return true;
    }
    return false;
  });
}

function PasswordRules({ strength }: { strength: PasswordCheck }) {
  const good = strength.issues.length === 0;

  return (
    <div className="rounded-xl bg-[color:var(--color-light)]/70 px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="font-medium">
          Password strength:{" "}
          <span className={good ? "text-green-700" : "text-amber-700"}>{strength.label}</span>
        </p>
        <span className="text-xs text-[color:var(--color-text-muted)]">Follow the rules below.</span>
      </div>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        {strength.issues.length === 0 ? (
          <li className="text-green-700">
            Looks strong. Best practice: use a passphrase from a password manager and enable 2FA after sign-up.
          </li>
        ) : (
          strength.issues.map((issue) => <li key={issue}>{issue}</li>)
        )}
      </ul>
    </div>
  );
}

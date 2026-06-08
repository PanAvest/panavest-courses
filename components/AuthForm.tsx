"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { COUNTRIES } from "@/lib/countries";
import { educationOptions } from "@/lib/profileConstants";
import { evaluatePassword, type PasswordCheck } from "@/lib/passwordStrength";
import ModernDatePicker, { toIsoDateString } from "@/components/ModernDatePicker";
import PasswordRules from "@/components/PasswordRules";

type Mode = "sign-in" | "sign-up";

type StepData = {
  fullName: string;
  dob: string;
  education: string;
  country: string;
  email: string;
  password: string;
  confirmPassword: string;
  passwordStrength: PasswordCheck;
};

const signUpSteps = ["Full name", "Date of birth", "Education", "Country", "Account"];

// Create the client only in the browser to avoid SSR issues
const supabase: SupabaseClient | null = typeof window !== "undefined" ? getSupabaseClient() : null;

export default function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  // Sign-up only fields
  const [fullName, setFullName] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [education, setEducation] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [step, setStep] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const title = mode === "sign-in" ? "Sign In" : "Create Account";
  const cta = mode === "sign-in" ? "Sign In" : "Sign Up";

  const normalizedEmail = email.trim();
  const maxDob = useMemo(() => toIsoDateString(new Date()), []);
  const passwordStrength: PasswordCheck = useMemo(() => {
    return evaluatePassword(password, normalizedEmail, fullName);
  }, [password, normalizedEmail, fullName]);

  async function handleGoogleAuth() {
    setErr(null);
    setMsg(null);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/complete-profile` : undefined;
    if (!supabase) {
      setErr("Client not ready. Refresh and try again.");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    // Progress through steps before final submit
    if (mode === "sign-up" && step < signUpSteps.length - 1) {
      const stepError = validateStep(step, {
        fullName,
        dob,
        education,
        country,
        email: normalizedEmail,
        password,
        confirmPassword,
        passwordStrength,
      });
      if (stepError) {
        setErr(stepError);
        return;
      }
      setStep((s) => s + 1);
      return;
    }

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
        window.location.assign("/");
      } else {
        const validationError = validateSignUp({
          fullName,
          dob,
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
        const ageVal = calcAgeFromDob(dob);

        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/sign-in`,
            data: {
              full_name: fullName.trim(),
              date_of_birth: dob,
              age: ageVal,
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
    <div className="w-full rounded-2xl bg-white p-7 shadow-[0_4px_24px_rgba(44,37,34,0.08)] border border-[color:var(--color-light)]">
      <h1 className="text-[22px] font-bold text-[color:var(--color-ink)]">{title}</h1>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">
        {mode === "sign-in" ? "Welcome back to KDS." : "Start your PanAvest journey."}
      </p>

      <div className="mt-5 space-y-3">
        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[color:var(--color-light)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--color-ink)] shadow-sm transition hover:bg-[color:var(--color-bg)] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
        >
          {/* Google G logo */}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted)]">
          <div className="h-px flex-1 bg-[color:var(--color-light)]" />
          <span>{mode === "sign-up" ? "or create with email" : "or sign in with email"}</span>
          <div className="h-px flex-1 bg-[color:var(--color-light)]" />
        </div>
      </div>

      {mode === "sign-up" && msg && (
        <div className="mt-6 space-y-4 rounded-xl bg-[color:var(--color-light)]/70 p-5 text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
          <p className="text-lg font-semibold text-[color:var(--color-brand)]">Account created</p>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Check your email to verify, then sign in to continue.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="w-full rounded-xl bg-[color:var(--color-brand)] px-4 py-2 text-center font-semibold text-white hover:opacity-90 sm:w-auto"
            >
              Go to homepage
            </Link>
            <Link
              href="/auth/sign-in"
              className="w-full rounded-xl bg-white px-4 py-2 text-center font-semibold text-[color:var(--color-brand)] shadow-sm transition-shadow duration-200 hover:shadow-md sm:w-auto focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "sign-up" ? (
          <>
            <StepHeader current={step} total={signUpSteps.length} label={signUpSteps[step]} />

            {step === 0 && (
              <label className="block">
                <span className="text-sm">Full name</span>
                <input
                  type="text"
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 placeholder:text-[color:var(--color-muted)]/60"
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  placeholder="Ama Mensah"
                />
              </label>
            )}

            {step === 1 && (
              <label className="block">
                <span className="text-sm">Date of birth</span>
                <ModernDatePicker
                  value={dob}
                  onChange={setDob}
                  min="1900-01-01"
                  max={maxDob}
                  placeholder="Select your date of birth"
                />
              </label>
            )}

            {step === 2 && (
              <fieldset className="mt-1 rounded-xl border border-[color:var(--color-light)] bg-white px-4 py-3 shadow-sm">
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
                <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
                  Doctorate (PhD) is optional—select the level that best fits you.
                </p>
              </fieldset>
            )}

            {step === 3 && (
              <label className="block">
                <span className="text-sm">Country</span>
                <select
                  name="country"
                  autoComplete="country-name"
                  className="mt-1 w-full rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 placeholder:text-[color:var(--color-muted)]/60"
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
            )}

            {step === 4 && (
              <>
                <label className="block">
                  <span className="text-sm">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 placeholder:text-[color:var(--color-muted)]/60"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm">Password</span>
                  <div className="mt-1 flex w-full items-center rounded-xl border border-[color:var(--color-light)] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--color-brand)]/30">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm focus:outline-none placeholder:text-[color:var(--color-muted)]/60"
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      placeholder="Use 6+ characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="px-3 text-xs font-semibold text-[color:var(--color-brand)]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm">Confirm password</span>
                  <div className="mt-1 flex w-full items-center rounded-xl border border-[color:var(--color-light)] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--color-brand)]/30">
                    <input
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm focus:outline-none placeholder:text-[color:var(--color-muted)]/60"
                      value={confirmPassword}
                      onChange={(ev) => setConfirmPassword(ev.target.value)}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="px-3 text-xs font-semibold text-[color:var(--color-brand)]"
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <PasswordRules strength={passwordStrength} />
              </>
            )}
          </>
        ) : (
          <>
            <label className="block">
              <span className="text-sm">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                className="mt-1 w-full rounded-xl border border-[color:var(--color-light)] bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30 placeholder:text-[color:var(--color-muted)]/60"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm">Password</span>
              <div className="mt-1 flex w-full items-center rounded-xl border border-[color:var(--color-light)] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[color:var(--color-brand)]/30">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm focus:outline-none placeholder:text-[color:var(--color-muted)]/60"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="Use 6+ characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="px-3 text-xs font-semibold text-[color:var(--color-brand)]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-2 text-right text-xs text-[color:var(--color-text-muted)]">
                <a href="/auth/reset" className="underline hover:text-[color:var(--color-brand)]">Forgot password?</a>
              </div>
            </label>
          </>
        )}

        {err && <div className="rounded-lg bg-red-600/10 px-3 py-2 text-sm text-red-700">{err}</div>}
        {msg && <div className="rounded-lg bg-green-600/10 px-3 py-2 text-sm text-green-800">{msg}</div>}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {mode === "sign-up" && step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="w-full rounded-xl border border-[color:var(--color-light)] bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-bg)] transition sm:w-auto focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/30"
            >
              ← Back
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[color:var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition sm:w-auto"
          >
            {busy ? "Please wait…" : mode === "sign-up" && step < signUpSteps.length - 1 ? "Continue →" : cta}
          </button>
        </div>
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

function validateStep(stepIndex: number, data: StepData) {
  if (stepIndex === 0 && !data.fullName.trim()) return "Full name is required.";
  if (stepIndex === 1) {
    const dob = data.dob?.trim();
    if (!dob) return "Date of birth is required.";
    if (!isOldEnough(dob, 13)) return "You must be at least 13 years old.";
  }
  if (stepIndex === 2 && !data.education) return "Select your highest educational qualification.";
  if (stepIndex === 3 && !data.country) return "Select your country.";
  if (stepIndex === 4) {
    if (!data.email) return "Email is required.";
    if (!data.password) return "Password is required.";
    if (data.passwordStrength.issues.length > 0) {
      return `Update your password to meet our strength rules: ${data.passwordStrength.issues.join("; ")}`;
    }
    if (data.password !== data.confirmPassword) return "Passwords do not match.";
  }
  return null;
}

function validateSignUp({
  fullName,
  dob,
  education,
  country,
  password,
  confirmPassword,
  passwordStrength,
}: {
  fullName: string;
  dob: string;
  education: string;
  country: string;
  password: string;
  confirmPassword: string;
  passwordStrength: PasswordCheck;
}) {
  if (!fullName.trim()) return "Full name is required.";
  if (!dob.trim()) return "Date of birth is required.";
  if (!isOldEnough(dob, 13)) return "You must be at least 13 years old.";

  if (!education) return "Select your highest educational qualification.";
  if (!country) return "Select your country.";

  if (passwordStrength.issues.length > 0) {
    return `Update your password to meet our strength rules: ${passwordStrength.issues.join("; ")}`;
  }

  if (confirmPassword !== password) return "Passwords do not match.";

  return null;
}

function isOldEnough(dob: string, minYears: number) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const age = today.getFullYear() - d.getFullYear() - (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age >= minYears;
}

function calcAgeFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  return today.getFullYear() - d.getFullYear() - (today < new Date(today.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
}

function StepHeader({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="space-y-3">
      {/* Dot steps */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i <= current ? "var(--color-brand)" : "var(--color-light)",
              width: i === current ? "1.75rem" : "0.375rem",
            }}
          />
        ))}
      </div>
      {/* Label */}
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        Step {current + 1} of {total} &mdash;{" "}
        <span className="text-[color:var(--color-brand)]">{label}</span>
      </div>
    </div>
  );
}

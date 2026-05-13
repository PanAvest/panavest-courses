import type { PasswordCheck } from "@/lib/passwordStrength";

export default function PasswordRules({ strength }: { strength: PasswordCheck }) {
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

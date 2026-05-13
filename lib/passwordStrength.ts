export type PasswordCheck = {
  label: "Weak" | "Strong" | "Very strong";
  issues: string[];
};

export function evaluatePassword(password: string, email: string, fullName: string): PasswordCheck {
  const issues: string[] = [];

  if (!password) {
    return {
      label: "Weak",
      issues: [
        "Use at least 6 characters",
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

  if (password.length < 6) issues.push("Use at least 6 characters (12+ recommended)");
  if (!/[A-Z]/.test(password)) issues.push("Add uppercase letters (A-Z)");
  if (!/[a-z]/.test(password)) issues.push("Add lowercase letters (a-z)");
  if (!/[0-9]/.test(password)) issues.push("Include numbers (0-9)");
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

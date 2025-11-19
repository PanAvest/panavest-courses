import { randomBytes } from "crypto";

/**
 * Generates a human-friendly certificate number.
 * Format: PV-YYYYMMDD-XXXXXX (X = hex chars).
 */
export function generateCertificateNumber(date: Date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `PV-${stamp}-${random}`;
}


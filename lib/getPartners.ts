import "server-only";

import { promises as fs } from "fs";
import type { Dirent } from "fs";
import path from "path";

export type PartnerLogo = {
  src: string;
  alt: string;
};

function prettifyAlt(fileName: string): string {
  const parsed = path.parse(fileName).name;
  const cleaned = parsed.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Partner";
  return cleaned
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export async function getPartners(): Promise<PartnerLogo[]> {
  const partnersDir = path.join(process.cwd(), "public", "Partners");

  let entries: Dirent[];
  try {
    entries = await fs.readdir(partnersDir, { withFileTypes: true });
  } catch (err) {
    console.error("[KDS] Unable to read /public/Partners", err);
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => ({
      src: `/Partners/${fileName}`,
      alt: prettifyAlt(fileName),
    }));
}

export default getPartners;

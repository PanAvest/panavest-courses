import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const conversions = [
  { src: "public/Boardroom.jpg", dest: "public/Boardroom.webp", quality: 80, removeOriginal: true },
  { src: "public/hero-illustration.png", dest: "public/hero-illustration.webp", quality: 80, removeOriginal: true },
];

const moves = [{ src: "public/hero-illustration.psd", dest: "design-source/hero-illustration.psd" }];

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
}

async function optimize() {
  for (const item of conversions) {
    await ensureDir(item.dest);
    console.log(`Optimizing ${item.src} -> ${item.dest}`);
    await sharp(item.src).webp({ quality: item.quality }).toFile(item.dest);
    if (item.removeOriginal) {
      await rm(item.src, { force: true });
    }
  }

  for (const move of moves) {
    await ensureDir(move.dest);
    console.log(`Moving ${move.src} -> ${move.dest}`);
    await rename(move.src, move.dest);
  }

  console.log("Done.");
}

optimize().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/**
 * Crop collection cover tiles from Smeg mega-menu screenshots.
 * Source images (1024px wide) — max ~650px output; for crisp covers upload via /admini/collections.
 *
 * Usage:
 *   node deploy/scripts/crop-collection-covers.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const OUT = path.join(ROOT, "public/brand/collections");
const ASSETS = path.join(process.env.HOME, ".cursor/projects/Users-edgarmanukyan-smegarm/assets");
const img1 = path.join(ASSETS, "______________2026-06-20___09.38.29-39962f1b-2d10-4828-9eab-791a92360116.png");
const img2 = path.join(ASSETS, "______________2026-06-20___09.38.22-cde38047-0c43-4a4a-8987-5d096b465a15.png");

fs.mkdirSync(OUT, { recursive: true });

async function saveSquare(src, x, y, size, slug, scale = 6) {
  const meta = await sharp(src).metadata();
  const left = Math.max(0, Math.min(x, meta.width - size));
  const top = Math.max(0, Math.min(y, meta.height - size));
  const side = Math.min(size, meta.width - left, meta.height - top);
  await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(side * scale, side * scale, { kernel: sharp.kernel.lanczos3 })
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT, `${slug}.jpg`));
  console.log(slug, `${side}px`);
}

async function fromTheme(slug, rel) {
  await sharp(path.join(ROOT, rel))
    .resize(800, 800, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT, `${slug}.jpg`));
  console.log(slug, "theme");
}

// Detected tile grid from screenshot analysis
const r1y = 137;
const sq = 108;
const r1x = [47, 179, 311, 442, 574, 705, 849];
const r1slugs = ["isola", "musa", "dolce-stil-novo", "linea", "classica", "portofino", "piano-design"];
for (let i = 0; i < r1slugs.length; i++) await saveSquare(img1, r1x[i], r1y, sq, r1slugs[i]);

const r2y = 350;
const r2slugs = ["fab-50s", "victoria", "coloniale"];
const r2x = [47, 179, 310];
for (let i = 0; i < r2slugs.length; i++) await saveSquare(img1, r2x[i], r2y, sq, r2slugs[i]);

const i2sq = 140;
const i2x = [60, 230, 400, 570];
await saveSquare(img2, i2x[0], 177, i2sq, "porsche");
await saveSquare(img2, i2x[0], 474, i2sq, "blu-mediterraneo");
await saveSquare(img2, i2x[1], 474, i2sq, "dolce-gabbana-sicily");
await saveSquare(img2, i2x[2], 474, i2sq, "divina-cucina");
await saveSquare(img2, i2x[3], 474, i2sq, "dolce-gabbana");

// High-res theme assets override screenshot crops where available
await fromTheme("blu-mediterraneo", "public/brand/themes/dg-blu-mediterraneo.jpg");
await fromTheme("dolce-gabbana-sicily", "public/brand/themes/dg-sicily.jpg");
await fromTheme("porsche", "public/brand/themes/porsche.jpg");
await fromTheme("coca-cola", "public/brand/themes/coca-cola.jpg");
await fromTheme("smeg500", "public/brand/themes/smeg500.jpg");

console.log("Done → public/brand/collections/");

import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT_DIRS = ["public", "src"];
const OUT_DIR = "public/_optimized";
const QUALITY = 78;

function targetWidth(filePath) {
  const p = filePath.toLowerCase();
  if (p.includes("hero") || p.includes("banner")) return 1920;
  if (p.includes("thumb") || p.includes("card") || p.includes("mini")) return 800;
  return 1600;
}

const patterns = INPUT_DIRS.map((d) => `${d}/**/*.{jpg,jpeg,png}`);
const files = await fg(patterns);

await fs.mkdir(OUT_DIR, { recursive: true });

let totalBefore = 0;
let totalAfter = 0;
let count = 0;

for (const file of files) {
  const width = targetWidth(file);

  const baseName = path.basename(file).replace(/\.(jpg|jpeg|png)$/i, ".webp");
  const outPath = path.join(OUT_DIR, baseName);

  const stats = await fs.stat(file);
  totalBefore += stats.size;

  const img = sharp(file, { failOn: "none" });
  const meta = await img.metadata();
  const finalWidth = meta.width && meta.width < width ? meta.width : width;

  await img
    .resize({ width: finalWidth, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  const newStats = await fs.stat(outPath);
  totalAfter += newStats.size;
  count++;
}

console.log("====================================");
console.log("Imagens processadas:", count);
console.log("Tamanho antes:", (totalBefore / 1024 / 1024).toFixed(2), "MB");
console.log("Tamanho depois:", (totalAfter / 1024 / 1024).toFixed(2), "MB");
console.log("Redução:", totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(2) + "%" : "N/A");
console.log("Saída em: public/_optimized");
console.log("====================================");

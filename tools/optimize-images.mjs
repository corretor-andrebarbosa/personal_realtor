import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const INPUT_DIRS = ["public", "src", "assets/originais"];
const OUT_DIR = "public/_optimized";
const QUALITY = 78;

// Pastas que NUNCA devem ser processadas (evita loop e lixo)
const IGNORE_DIRS = [
  `${OUT_DIR.replace(/\\/g, "/")}/**`,
  "node_modules/**",
  "dist/**",
];

function targetWidth(filePath) {
  const p = filePath.toLowerCase();
  if (p.includes("hero") || p.includes("banner")) return 1920;
  if (p.includes("thumb") || p.includes("card") || p.includes("mini")) return 800;
  return 1600;
}

function normalize(p) {
  return p.replace(/\\/g, "/");
}

function isInside(file, dir) {
  const norm = normalize(file);
  const d = normalize(dir).replace(/\/+$/, "");
  return norm.startsWith(d + "/");
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Procura só jpg/jpeg/png dentro das pastas de entrada
const patterns = INPUT_DIRS.map((d) => `${d}/**/*.{jpg,jpeg,png}`);
const files = await fg(patterns, { ignore: IGNORE_DIRS });

await fs.mkdir(OUT_DIR, { recursive: true });

let totalBefore = 0;
let totalAfter = 0;
let processed = 0;
let skipped = 0;

for (const file of files) {
  const width = targetWidth(file);

  // Descobre qual input dir é o “pai” pra manter subpastas
  const root = INPUT_DIRS.find((d) => isInside(file, d));
  const rel = root ? normalize(file).slice(normalize(root).length + 1) : path.basename(file);

  // Troca extensão para .webp
  const relWebp = rel.replace(/\.(jpg|jpeg|png)$/i, ".webp");

  // Mantém subpastas dentro de public/_optimized/<root>/...
  const outPath = path.join(OUT_DIR, root ?? "misc", relWebp);

  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const srcStats = await fs.stat(file);
  totalBefore += srcStats.size;

  // Se já existe um arquivo de saída mais novo que a fonte, pula
  if (await fileExists(outPath)) {
    const outStats = await fs.stat(outPath);
    if (outStats.mtimeMs >= srcStats.mtimeMs) {
      totalAfter += outStats.size;
      skipped++;
      continue;
    }
  }

  const img = sharp(file, { failOn: "none" });
  const meta = await img.metadata();
  const finalWidth = meta.width && meta.width < width ? meta.width : width;

  await img
    .resize({ width: finalWidth, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  const outStats = await fs.stat(outPath);
  totalAfter += outStats.size;
  processed++;
}

console.log("====================================");
console.log("Imagens encontradas:", files.length);
console.log("Imagens processadas:", processed);
console.log("Imagens puladas:", skipped);
console.log("Tamanho antes:", (totalBefore / 1024 / 1024).toFixed(2), "MB");
console.log("Tamanho depois:", (totalAfter / 1024 / 1024).toFixed(2), "MB");
console.log(
  "Redução:",
  totalBefore ? ((1 - totalAfter / totalBefore) * 100).toFixed(2) + "%" : "N/A"
);
console.log("Saída em:", OUT_DIR);
console.log("====================================");
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const W = 1200;
const H = 630;
const LOGO_MAX_W = 900;
const LOGO_MAX_H = 380;

const logoPath = join(ROOT, 'public', 'newlogo2.png');
const outPath  = join(ROOT, 'public', 'og-image.png');

// Redimensiona o logo mantendo proporção, dentro dos limites
const logoBuf = readFileSync(logoPath);
const meta    = await sharp(logoBuf).metadata();
const scale   = Math.min(LOGO_MAX_W / meta.width, LOGO_MAX_H / meta.height);
const lw      = Math.round(meta.width  * scale);
const lh      = Math.round(meta.height * scale);

const resizedLogo = await sharp(logoBuf)
  .resize(lw, lh, { fit: 'inside' })
  .png()
  .toBuffer();

// Fundo branco 1200×630 com logo centralizado
const left = Math.round((W - lw) / 2);
const top  = Math.round((H - lh) / 2);

await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
})
  .composite([{ input: resizedLogo, left, top }])
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(`✓ og-image.png gerada: ${lw}×${lh}px centralizada em ${W}×${H}px`);

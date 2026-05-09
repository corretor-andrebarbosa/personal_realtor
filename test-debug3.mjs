import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FULL_MOON_THRESHOLD = 0.98;
const ANCHOR_ISO = '2025-04-13';

const illumCache = new Map();

function isoToDayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayNumToISO(dayNum) {
  const d = new Date(dayNum * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function maxIlluminationForDay(dayNum) {
  if (illumCache.has(dayNum)) return illumCache.get(dayNum);
  let max = 0;
  const baseMs = dayNum * MS_PER_DAY;
  for (let hour = 0; hour < 24; hour++) {
    const t = new Date(baseMs + hour * 3600 * 1000);
    const frac = SunCalc.getMoonIllumination(t).fraction;
    if (frac > max) max = frac;
  }
  illumCache.set(dayNum, max);
  return max;
}

function decideMonthLength(startDayNum) {
  const day29 = startDayNum + 28;
  const day30 = startDayNum + 29;
  const i29 = maxIlluminationForDay(day29);
  const i30 = maxIlluminationForDay(day30);
  console.log(`  Day 29 (${dayNumToISO(day29)}): ${i29.toFixed(3)}`);
  console.log(`  Day 30 (${dayNumToISO(day30)}): ${i30.toFixed(3)}`);
  if (i29 >= FULL_MOON_THRESHOLD) {
    const result = i30 >= FULL_MOON_THRESHOLD ? 30 : 29;
    console.log(`  → ${result} dias`);
    return result;
  }
  console.log(`  → 30 dias`);
  return 30;
}

// Verificar últimos 6 meses de 2025 e primeiros de 2026
console.log('Analisando meses de 2025-2026:\n');

let startDayNum = isoToDayNum(ANCHOR_ISO);
let year = 2025;
let month = 1;

for (let i = 0; i < 14; i++) {
  console.log(`Mês ${year}/${month} começando em ${dayNumToISO(startDayNum)}:`);
  const length = decideMonthLength(startDayNum);
  console.log(`  Resultado: ${length} dias, próximo mês em ${dayNumToISO(startDayNum + length)}\n`);
  
  startDayNum += length;
  month++;
  if (month > 13) { month = 1; year++; }
}

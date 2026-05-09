import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FULL_MOON_THRESHOLD = 0.98;
const ANCHOR_ISO = '2025-04-13';
const ANCHOR_YEAR = 2025;
const ANCHOR_MONTH = 1;
const MONTHS_TO_GENERATE = 48;

const illumCache = new Map();

function isoToDayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayNumToDate(dayNum) {
  return new Date(dayNum * MS_PER_DAY);
}

function dayNumToISO(dayNum) {
  const d = dayNumToDate(dayNum);
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
  if (i29 >= FULL_MOON_THRESHOLD) {
    return i30 >= FULL_MOON_THRESHOLD ? 30 : 29;
  }
  return 30;
}

let calendar = null;

function buildCalendar() {
  if (calendar) return calendar;

  const months = [];
  let startDayNum = isoToDayNum(ANCHOR_ISO);
  let month = ANCHOR_MONTH;
  let year = ANCHOR_YEAR;

  for (let i = 0; i < MONTHS_TO_GENERATE; i++) {
    const length = decideMonthLength(startDayNum);
    months.push({ year, month, startDayNum, length });
    startDayNum += length;
    month++;
    if (month > 13) { month = 1; year++; }
  }

  calendar = months;
  return months;
}

function findMonth(dayNum) {
  const months = buildCalendar();
  for (let i = months.length - 1; i >= 0; i--) {
    if (dayNum >= months[i].startDayNum) return months[i];
  }
  return null;
}

// DEBUG: Verificar mês para 2026-05-04
const targetISO = '2026-05-04';
const targetDayNum = isoToDayNum(targetISO);
const month = findMonth(targetDayNum);

console.log('Target:', targetISO, 'DayNum:', targetDayNum);
console.log('Found month:', month);
console.log('Day in month calc:', targetDayNum - month.startDayNum + 1);
console.log('');

// Verificar alguns meses para entender o padrão
const cal = buildCalendar();
console.log('Calendário dos últimos 8 meses:');
for (let i = cal.length - 8; i < cal.length; i++) {
  const m = cal[i];
  const startISO = dayNumToISO(m.startDayNum);
  const endISO = dayNumToISO(m.startDayNum + m.length - 1);
  console.log(`Mês ${m.year}/${m.month} (${m.length} dias): ${startISO} até ${endISO}`);
}

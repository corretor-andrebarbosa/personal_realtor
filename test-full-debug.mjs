import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FULL_MOON_THRESHOLD = 0.98;
const ANCHOR_ISO = '2026-05-02';
const ANCHOR_YEAR = 2026;
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

function checkDay(iso) {
  const dayNum = isoToDayNum(iso);
  const m = findMonth(dayNum);

  if (!m) return { isRestDay: false };

  const dayInMonth = dayNum - m.startDayNum + 1;
  if (dayInMonth < 1 || dayInMonth > m.length) return { isRestDay: false };

  // Lua Nova (Dia 1)
  if (dayInMonth === 1) {
    return { isRestDay: true, name: 'Lua Nova (Rosh Chodesh)' };
  }

  // Shabbat semanal
  if ([8, 15, 22, 29].includes(dayInMonth)) {
    return { isRestDay: true, name: 'Shabbat' };
  }

  // Festas do Mês 1 (Abib)
  if (m.month === 1) {
    if (dayInMonth === 14) return { isRestDay: true, name: 'Pesach' };
    if (dayInMonth >= 15 && dayInMonth <= 21) return { isRestDay: true, name: 'Chag HaMatzot' };
  }

  // Festas do Mês 7
  if (m.month === 7) {
    if (dayInMonth === 1) return { isRestDay: true, name: 'Yom Teruah' };
    if (dayInMonth === 10) return { isRestDay: true, name: 'Yom Kippur' };
    if (dayInMonth >= 15 && dayInMonth <= 21) return { isRestDay: true, name: 'Sukkot' };
  }

  return { isRestDay: false };
}

// DEBUG COMPLETO para 2026-05-04
console.log('=== VERIFICAÇÃO COMPLETA DE 2026-05-04 ===\n');

const targetISO = '2026-05-04';
const targetDayNum = isoToDayNum(targetISO);
const month = findMonth(targetDayNum);

console.log(`Data: ${targetISO}`);
console.log(`DayNum: ${targetDayNum}`);
console.log(`Mês encontrado:`, month);
console.log(`Dia do mês: ${targetDayNum - month.startDayNum + 1}`);
console.log(`checkDay result:`, checkDay(targetISO));

// Verificar últimos 3 meses
const cal = buildCalendar();
console.log('\n=== ÚLTIMOS 3 MESES ===');
for (let i = Math.max(0, cal.length - 3); i < cal.length; i++) {
  const m = cal[i];
  const startISO = dayNumToISO(m.startDayNum);
  const endISO = dayNumToISO(m.startDayNum + m.length - 1);
  console.log(`Mês ${m.year}/${String(m.month).padStart(2, '0')} (${m.length}d): ${startISO} → ${endISO}`);
}

// Simular getTodayStatus com UTC
console.log('\n=== getTodayStatus (simulated) ===');
const now = new Date();
console.log('Data/hora atual (JS):', now);
const iso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
console.log('ISO (UTC):', iso);
const status = checkDay(iso);
console.log('Status:', status);

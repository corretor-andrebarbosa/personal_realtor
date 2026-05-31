import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FULL_MOON_THRESHOLD = 0.98;
const LAT = -7.12;
const LON = -34.86;
const ANCHOR_ISO = '2026-05-02';
const ANCHOR_YEAR = 2026;
const ANCHOR_MONTH = 1;
const MONTHS_TO_GENERATE = 48;

const illumCache = new Map();

function isoToDayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayNumToISO(n) {
  const d = new Date(n * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function maxIllum(dayNum) {
  if (illumCache.has(dayNum)) return illumCache.get(dayNum);
  let max = 0;
  for (let h = 0; h < 24; h++) {
    const f = SunCalc.getMoonIllumination(new Date(dayNum * MS_PER_DAY + h * 3600000)).fraction;
    if (f > max) max = f;
  }
  illumCache.set(dayNum, max);
  return max;
}

function monthLength(startDayNum) {
  const i29 = maxIllum(startDayNum + 28);
  const i30 = maxIllum(startDayNum + 29);
  if (i29 >= FULL_MOON_THRESHOLD) return i30 >= FULL_MOON_THRESHOLD ? 30 : 29;
  return 30;
}

let _calendar = null;
function buildCalendar() {
  if (_calendar) return _calendar;
  const months = [];
  let start = isoToDayNum(ANCHOR_ISO), month = ANCHOR_MONTH, year = ANCHOR_YEAR;
  for (let i = 0; i < MONTHS_TO_GENERATE; i++) {
    const length = monthLength(start);
    months.push({ year, month, startDayNum: start, length });
    start += length;
    if (++month > 13) { month = 1; year++; }
  }
  return (_calendar = months);
}

function findMonth(dayNum) {
  const months = buildCalendar();
  for (let i = months.length - 1; i >= 0; i--)
    if (dayNum >= months[i].startDayNum) return months[i];
  return null;
}

function checkDay(iso) {
  const dayNum = isoToDayNum(iso);
  const m = findMonth(dayNum);
  if (!m) return { isRestDay: false };
  const d = dayNum - m.startDayNum + 1;
  if (d < 1 || d > m.length) return { isRestDay: false };

  if (d === 1) return { isRestDay: true, name: 'Lua Nova' };
  if ([8, 15, 22, 29].includes(d)) return { isRestDay: true, name: 'Shabbat' };

  if (m.month === 1) {
    if (d === 14) return { isRestDay: true, name: 'Pesach', startsAtSunset: true };
    if (d === 21) return { isRestDay: true, name: 'Chag HaMatzot (último dia)' };
  }
  if (m.month === 7) {
    if (d === 1)  return { isRestDay: true, name: 'Yom Teruah' };
    if (d === 10) return { isRestDay: true, name: 'Yom Kippur' };
    if (d >= 15 && d <= 21) return { isRestDay: true, name: 'Sukkot' };
  }
  return { isRestDay: false };
}

function scriptDayISO(now) {
  const utcNoon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const sunrise = SunCalc.getTimes(utcNoon, LAT, LON).sunrise;
  const day = now < sunrise ? new Date(now.getTime() - MS_PER_DAY) : now;
  return {
    iso: `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`,
    day,
  };
}

export function isWorkingNow() {
  const now = new Date();
  const { iso, day } = scriptDayISO(now);
  const { isRestDay, startsAtSunset } = checkDay(iso);
  if (!isRestDay) return true;
  if (startsAtSunset) {
    const noon = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0));
    return now < SunCalc.getTimes(noon, LAT, LON).sunset;
  }
  return false;
}

// Ms até a próxima mudança de estado (trabalho ↔ descanso)
export function msUntilNextTransition() {
  const now = new Date();
  const { iso, day } = scriptDayISO(now);
  const { isRestDay, startsAtSunset } = checkDay(iso);
  const noon = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0));

  if (!isRestDay) {
    // Trabalho → fim do dia escritural = alvorada de amanhã
    const tomorrowNoon = new Date(noon.getTime() + MS_PER_DAY);
    const tomorrowSunrise = SunCalc.getTimes(tomorrowNoon, LAT, LON).sunrise;
    return Math.max(tomorrowSunrise.getTime() - now.getTime(), 60000);
  }

  if (startsAtSunset) {
    const sunset = SunCalc.getTimes(noon, LAT, LON).sunset;
    if (now < sunset) return sunset.getTime() - now.getTime(); // ainda trabalhando, muda no pôr do sol
  }

  // Descanso → encontra o primeiro dia útil futuro
  let dayNum = isoToDayNum(iso);
  while (checkDay(dayNumToISO(++dayNum)).isRestDay) { /* avança */ }
  const resumeNoon = new Date(dayNum * MS_PER_DAY + 12 * 3600000);
  const resumeSunrise = SunCalc.getTimes(resumeNoon, LAT, LON).sunrise;
  return Math.max(resumeSunrise.getTime() - now.getTime(), 60000);
}

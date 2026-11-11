import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LAT = -7.12;
const LON = -34.86;

// Mesma regra de src/lib/scripturalCalendar.js (site) e do calendário de referência:
//   meses ímpares = 30 dias, meses pares = 29 dias, mês 13 (ano bissexto) = 30 dias
//   anos bissextos: 6000, depois a cada 3 anos (6003, 6006 …)
const ANCHOR_ISO = '2026-05-02'; // Ano 6001, Mês 1, Dia 1
const ANCHOR_YEAR = 6001;
const MONTHS_TO_GENERATE = 72;

function isoToDayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayNumToISO(n) {
  const d = new Date(n * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function isLeapYear(scriptYear) {
  if (scriptYear === 6000) return true;
  if (scriptYear === 6001) return false;
  return (scriptYear - 6000) % 3 === 0;
}

function monthLength(month) {
  if (month === 13) return 30;
  return month % 2 === 1 ? 30 : 29;
}

function daysInYear(scriptYear) {
  const maxM = isLeapYear(scriptYear) ? 13 : 12;
  let total = 0;
  for (let m = 1; m <= maxM; m++) total += monthLength(m);
  return total;
}

let _calendar = null;
function buildCalendar() {
  if (_calendar) return _calendar;
  const months = [];
  // Recua 2 anos escriturais a partir da âncora, como no site
  let start = isoToDayNum(ANCHOR_ISO), year = ANCHOR_YEAR, month = 1;
  for (let i = 0; i < 2; i++) { year--; start -= daysInYear(year); }
  for (let i = 0; i < MONTHS_TO_GENERATE; i++) {
    const maxM = isLeapYear(year) ? 13 : 12;
    const length = monthLength(month);
    months.push({ year, month, startDayNum: start, length });
    start += length;
    if (++month > maxM) { month = 1; year++; }
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
    // Sukkot (15-21) é festa, mas com trabalho permitido: não pausa o monitor
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

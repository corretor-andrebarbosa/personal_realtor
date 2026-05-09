/**
 * Calendário Escritural Celestial
 * Portado de https://github.com/yashraal/celestial-calendar-clock-converter-c4
 *
 * Âncoras confirmadas:
 *   Ano 2026, Mês 1, Dia 1 = 02/05/2026 (Abib 1) ← âncora correta confirmada no código-fonte
 *
 * Dias de descanso obrigatório:
 *   Shabbat: dias 8, 15, 22 e 29 de cada mês
 *   Festas: Pesach, Chag HaMatzot, Yom Teruah, Yom Kippur, Sukkot
 *   Lua Nova: dia 1 de cada mês
 */

import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FULL_MOON_THRESHOLD = 0.98;

// Coordenadas de João Pessoa, PB — fronteira do dia escritural (nascer do sol)
const LAT = -7.12;
const LON = -34.86;

// Âncora principal: 02/05/2026 = Abib 1 (Mês 1, Dia 1) do ano 2026
// Começar da âncora mais recente e confirmada garante precisão
const ANCHOR_ISO = '2026-05-02';
const ANCHOR_YEAR = 2026;
const ANCHOR_MONTH = 1;
const MONTHS_TO_GENERATE = 48; // ~4 anos (passado e futuro)

// Cache de iluminação lunar (evita recalcular)
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

// Calendário gerado uma única vez
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

/**
 * Verifica se uma data ISO é dia de descanso escritural.
 * Retorna { isRestDay, name } ou { isRestDay: false }
 */
export function checkDay(iso) {
  const dayNum = isoToDayNum(iso);
  const m = findMonth(dayNum);

  if (!m) return { isRestDay: false };

  const dayInMonth = dayNum - m.startDayNum + 1;
  if (dayInMonth < 1 || dayInMonth > m.length) return { isRestDay: false };

  // Lua Nova (Dia 1) — observância
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

/**
 * Retorna a data/hora em que o período de descanso termina.
 * O dia escritural termina na alvorada do dia seguinte, no local do usuário.
 */
export function getRestPeriodEnd(iso, lat = LAT, lon = LON) {
  const startDayNum = isoToDayNum(iso);
  let dayNum = startDayNum;

  // Avança até encontrar o último dia consecutivo de descanso
  while (true) {
    const nextISO = dayNumToISO(dayNum + 1);
    if (!checkDay(nextISO).isRestDay) break;
    dayNum++;
  }

  // Alvorada do dia calendário seguinte — usar meio-dia UTC para evitar o mesmo problema
  // de SunCalc retornar a alvorada errada quando passamos meia-noite UTC
  const nextDayNoon = new Date((dayNum + 1) * MS_PER_DAY + 12 * 3600 * 1000);
  return SunCalc.getTimes(nextDayNoon, lat, lon).sunrise;
}

/**
 * Retorna o status escritural atual de forma assíncrona.
 * Usa a geolocalização do browser para calcular a alvorada local do visitante.
 * O dia escritural começa na alvorada — antes dela ainda é o dia anterior.
 * Fallback: João Pessoa, PB (coordenadas padrão do corretor).
 * { isRestDay, name, endsAt }
 */
export async function getTodayStatus() {
  const now = new Date();

  // Tenta obter coordenadas reais do visitante
  let lat = LAT, lon = LON;
  try {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          maximumAge: 3600000, // aceita cache de até 1 hora
          enableHighAccuracy: false,
        })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    }
  } catch {
    // Permissão negada ou timeout — usa coordenadas padrão (João Pessoa)
  }

  // SunCalc.getTimes(now) retorna a alvorada do dia solar EM CURSO, não do próximo nascer.
  // Para obter a alvorada correta do dia calendário UTC, passamos o meio-dia UTC desse dia.
  const utcNoon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const todaySunrise = SunCalc.getTimes(utcNoon, lat, lon).sunrise;

  // Antes da alvorada, o dia escritural ativo ainda é o anterior
  const scriptDay = now < todaySunrise
    ? new Date(now.getTime() - MS_PER_DAY)
    : now;

  const iso = `${scriptDay.getUTCFullYear()}-${String(scriptDay.getUTCMonth() + 1).padStart(2, '0')}-${String(scriptDay.getUTCDate()).padStart(2, '0')}`;
  const { isRestDay, name } = checkDay(iso);
  if (!isRestDay) return { isRestDay: false };
  return { isRestDay: true, name, endsAt: getRestPeriodEnd(iso, lat, lon) };
}

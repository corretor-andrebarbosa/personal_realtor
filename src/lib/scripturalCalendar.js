/**
 * Calendário Escritural Celestial
 * Portado de https://github.com/yashraal/celestial-calendar-clock-converter-c4
 *
 * Regra de comprimento mensal (exatamente como o site de referência):
 *   Meses ímpares  (1,3,5,7,9,11) = 30 dias
 *   Meses pares    (2,4,6,8,10,12) = 29 dias
 *   Mês 13 (ano bissexto)          = 30 dias
 *
 * Anos bissextos (13 meses): ano 6000, depois a cada 3 anos (6003, 6006 …)
 *
 * Âncoras confirmadas no código-fonte de referência:
 *   Ano 6000, Mês 1, Dia 1 = 13/04/2025
 *   Ano 6001, Mês 1, Dia 1 = 02/05/2026
 *
 * Dias de descanso obrigatório:
 *   Lua Nova : dia 1 de cada mês
 *   Shabbat  : dias 8, 15, 22 e 29 de cada mês
 *   Festas   : Pesach (14/1), Chag HaMatzot último dia (21/1),
 *              Yom Teruah (1/7), Yom Kippur (10/7), Sukkot (15-21/7)
 */

import SunCalc from 'suncalc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Coordenadas de João Pessoa, PB
const LAT = -7.12;
const LON = -34.86;

// Âncoras (mesmo valor do site de referência)
const ANCHOR_6000_ISO = '2025-04-13'; // Ano 6000, Mês 1, Dia 1
const ANCHOR_6001_ISO = '2026-05-02'; // Ano 6001, Mês 1, Dia 1

// ─── Funções de data UTC ───────────────────────────────────────────────────

function isoToDayNum(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayNumToISO(dayNum) {
    const d = new Date(dayNum * MS_PER_DAY);
    return [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, '0'),
        String(d.getUTCDate()).padStart(2, '0'),
    ].join('-');
}

// ─── Regras do calendário escritural ──────────────────────────────────────

function isLeapYear(scriptYear) {
    if (scriptYear === 6000) return true;
    if (scriptYear === 6001) return false;
    return (scriptYear - 6000) % 3 === 0;
}

// Comprimento mensal conforme o site de referência: ímpar=30, par=29, mês 13=30
function getMonthLength(monthIndex) {
    if (monthIndex === 13) return 30;
    return (monthIndex % 2 === 1) ? 30 : 29;
}

function daysInScripturalYear(scriptYear) {
    const maxM = isLeapYear(scriptYear) ? 13 : 12;
    let total = 0;
    for (let m = 1; m <= maxM; m++) total += getMonthLength(m);
    return total; // 354 comum, 384 bissexto
}

// ─── Construção do calendário ──────────────────────────────────────────────

let _calendar = null;

function buildCalendar() {
    if (_calendar) return _calendar;

    const months = [];

    // Ponto de partida: âncora de 2026 (ano 6001, mês 1)
    const anchorDayNum = isoToDayNum(ANCHOR_6001_ISO);

    // Recua 2 anos escriturais para cobrir 2025 e datas anteriores
    let startDayNum = anchorDayNum;
    let year = 6001;
    const backYears = 2;
    for (let i = 0; i < backYears; i++) {
        year--;
        startDayNum -= daysInScripturalYear(year);
    }
    let month = 1;

    // Gera 72 meses (~6 anos, para cobrir o passado e o futuro)
    for (let i = 0; i < 72; i++) {
        const maxM = isLeapYear(year) ? 13 : 12;
        const length = getMonthLength(month);
        months.push({ year, month, startDayNum, length });
        startDayNum += length;
        month++;
        if (month > maxM) { month = 1; year++; }
    }

    _calendar = months;
    return months;
}

function findMonth(dayNum) {
    const months = buildCalendar();
    for (let i = months.length - 1; i >= 0; i--) {
        if (dayNum >= months[i].startDayNum) return months[i];
    }
    return null;
}

// ─── API pública ───────────────────────────────────────────────────────────

/**
 * Verifica se uma data ISO (UTC) é dia de descanso escritural.
 */
export function checkDay(iso) {
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
        if (dayInMonth === 14) return { isRestDay: true, name: 'Pesach', startsAtSunset: true };
        if (dayInMonth === 21) return { isRestDay: true, name: 'Chag HaMatzot (último dia)' };
    }

    // Festas do Mês 7
    if (m.month === 7) {
        if (dayInMonth === 1)  return { isRestDay: true, name: 'Yom Teruah' };
        if (dayInMonth === 10) return { isRestDay: true, name: 'Yom Kippur' };
        if (dayInMonth >= 15 && dayInMonth <= 21) return { isRestDay: true, name: 'Sukkot' };
    }

    return { isRestDay: false };
}

/**
 * Retorna a data/hora em que o período de descanso termina
 * (alvorada do primeiro dia útil após a sequência de descanso).
 */
export function getRestPeriodEnd(iso, lat = LAT, lon = LON) {
    let dayNum = isoToDayNum(iso);

    // Avança enquanto o próximo dia também for de descanso
    while (true) {
        const nextISO = dayNumToISO(dayNum + 1);
        if (!checkDay(nextISO).isRestDay) break;
        dayNum++;
    }

    // Alvorada do dia seguinte ao último dia de descanso
    const nextDayNoon = new Date((dayNum + 1) * MS_PER_DAY + 12 * 3600 * 1000);
    return SunCalc.getTimes(nextDayNoon, lat, lon).sunrise;
}

/**
 * Status escritural atual (assíncrono).
 * O dia escritural começa na alvorada; antes dela ainda é o dia anterior.
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
                    maximumAge: 3600000,
                    enableHighAccuracy: false,
                })
            );
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
        }
    } catch { /* usa coordenadas padrão */ }

    // Alvorada do dia UTC atual (calculada ao meio-dia UTC para evitar ambiguidade)
    const utcNoon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
    const todaySunrise = SunCalc.getTimes(utcNoon, lat, lon).sunrise;

    // Antes da alvorada → dia escritural ativo ainda é o anterior
    const scriptDay = now < todaySunrise
        ? new Date(now.getTime() - MS_PER_DAY)
        : now;

    const iso = [
        scriptDay.getUTCFullYear(),
        String(scriptDay.getUTCMonth() + 1).padStart(2, '0'),
        String(scriptDay.getUTCDate()).padStart(2, '0'),
    ].join('-');

    const { isRestDay, name, startsAtSunset } = checkDay(iso);
    if (!isRestDay) return { isRestDay: false };

    // Dias que só entram em descanso a partir do pôr do sol (ex.: Pesach dia 14)
    if (startsAtSunset) {
        const scriptDayNoon = new Date(Date.UTC(
            scriptDay.getUTCFullYear(),
            scriptDay.getUTCMonth(),
            scriptDay.getUTCDate(),
            12, 0, 0
        ));
        const todaySunset = SunCalc.getTimes(scriptDayNoon, lat, lon).sunset;
        if (now < todaySunset) return { isRestDay: false };
    }

    return { isRestDay: true, name, endsAt: getRestPeriodEnd(iso, lat, lon) };
}

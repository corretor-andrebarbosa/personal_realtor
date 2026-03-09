/**
 * useSetApartDayStatus
 * Calcula em tempo real se o momento atual é Shabbat, Rosh Chodesh ou Festa Escritural,
 * respeitando que o dia escritural começa e termina no pôr do sol
 * (≈ 18h horário de João Pessoa = 21h UTC).
 *
 * Lógica calendária espelha: yashraal.github.io/celestial-calendar-clock-converter-c4
 * Âncora: 13 de abril de 2025, 12h local = Ano 6000, Mês 1, Dia 1
 */

import { useState, useEffect } from 'react';

// ─── Constantes ───────────────────────────────────────────────────────────────

// Âncora do app original (noon local)
const ANCHOR = new Date(2025, 3, 13, 12, 0, 0);

// Pôr do sol aproximado para João Pessoa, Brasil (UTC-3) → 18:00 local = 21:00 UTC
// Variação anual < 30min devido à proximidade do equador — constante é suficientemente precisa
const SUNSET_UTC_HOUR = 21;

// ─── Calendário escritural ────────────────────────────────────────────────────

function isLeapYear(year) {
    if (year === 6000) return true;
    if (year === 6001) return false;
    return (year - 6000) % 3 === 0;
}

function getMonthLength(month) {
    if (month === 13) return 29;
    return month % 2 !== 0 ? 30 : 29;
}

function getYearLength(year) {
    return isLeapYear(year) ? 383 : 354;
}

function getYearStartMs(year) {
    let ms = ANCHOR.getTime();
    for (let y = 6000; y < year; y++) ms += getYearLength(y) * 86400000;
    return ms;
}

/** Converte um Date normalizado ao meio-dia em {year, month, day} escritural */
function getScripturalDay(noonDate) {
    const diffDays = Math.floor((noonDate.getTime() - ANCHOR.getTime()) / 86400000);
    if (diffDays < 0) return null;

    let year = 6000 + Math.floor(diffDays / 354.367);
    let ysMs = getYearStartMs(year);
    while (noonDate.getTime() < ysMs) { year--; ysMs = getYearStartMs(year); }
    let ny = getYearStartMs(year + 1);
    while (noonDate.getTime() >= ny) { year++; ysMs = ny; ny = getYearStartMs(year + 1); }

    let rem = Math.floor((noonDate.getTime() - ysMs) / 86400000);
    let month = 1;
    const maxMonth = isLeapYear(year) ? 13 : 12;
    while (month < maxMonth) {
        const ml = getMonthLength(month);
        if (rem < ml) break;
        rem -= ml;
        month++;
    }
    return { year, month, day: rem + 1 };
}

// ─── Pôr do sol ───────────────────────────────────────────────────────────────

/** Retorna timestamp UTC do pôr do sol (21h UTC) do dia gregoriano indicado */
function getSunsetMs(date) {
    const d = new Date(date);
    d.setUTCHours(SUNSET_UTC_HOUR, 0, 0, 0);
    return d.getTime();
}

// ─── Dias apartados ───────────────────────────────────────────────────────────

// Festas de observância obrigatória [mês, diaInicial, diaFinal, nome]
// Offsets do app: pesach=13, matzot=14–20, shavuot=66, kippur=186, sukkot=191–198
const FEAST_DAYS = [
    [1,  14, 14, 'Pessach'],
    [1,  15, 21, 'Chag HaMatzot'],
    [3,   8,  8, 'Shavuot'],
    [7,  10, 10, 'Yom Kippur'],
    [7,  15, 22, 'Sukkot'],
];

function getSetApartInfo(month, day) {
    // 1. Festas anuais têm prioridade (alguns dias coincidem com Shabbat)
    for (const [fm, fs, fe, fn] of FEAST_DAYS) {
        if (fm === month && day >= fs && day <= fe) {
            return { name: fn, extraDays: fe - day };
        }
    }
    // 2. Shabbat semanal — dias 8, 15, 22, 29 de cada mês
    if (day === 8 || day === 15 || day === 22 || day === 29) {
        return { name: 'Shabbat', extraDays: 0 };
    }
    // 3. Lua Nova — dia 1 de cada mês
    if (day === 1) {
        const nomes = { 1: 'Rosh Chodashim', 7: 'Yom Teruah' };
        return { name: nomes[month] || 'Rosh Chodesh', extraDays: 0 };
    }
    return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSetApartDayStatus() {
    const compute = () => {
        const nowMs = Date.now();
        const now = new Date(nowMs);

        // Determina o pôr do sol de hoje (UTC)
        const todaySunsetMs = getSunsetMs(now);
        const isAfterSunset = nowMs >= todaySunsetMs;

        // O próximo pôr do sol = fim do dia escritural atual
        const nextSunsetMs = isAfterSunset
            ? getSunsetMs(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
            : todaySunsetMs;

        // Qual data gregoriana corresponde ao dia escritural em curso?
        // - Antes do pôr do sol → dia escritural começou no pôr do sol de ONTEM → usar ontem ao meio-dia
        // - Após o pôr do sol  → dia escritural começou HOJE ao pôr do sol → usar hoje ao meio-dia
        const lookupDate = new Date(nowMs);
        if (!isAfterSunset) lookupDate.setDate(lookupDate.getDate() - 1);
        lookupDate.setHours(12, 0, 0, 0); // meio-dia local (compatível com app original)

        const sd = getScripturalDay(lookupDate);
        if (!sd) return { isSetApartDay: false, name: '', endTimeMs: 0 };

        const info = getSetApartInfo(sd.month, sd.day);
        if (!info) return { isSetApartDay: false, name: '', endTimeMs: 0 };

        // Fim do período apartado: próximo pôr do sol + dias extras da festa (aprox. 24h cada)
        const endTimeMs = nextSunsetMs + info.extraDays * 24 * 60 * 60 * 1000;

        return {
            isSetApartDay: true,
            name: info.name,
            endTimeMs,
            scripturalDate: sd,
        };
    };

    const [status, setStatus] = useState(compute);
    useEffect(() => {
        setStatus(compute());
        const iv = setInterval(() => setStatus(compute()), 60000);
        return () => clearInterval(iv);
    }, []);

    return status;
}

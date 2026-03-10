/**
 * Hook de conversão de moeda para artigos do blog.
 *
 * - Visitante de fora do Brasil: valores em R$ exibem ≈ na moeda local
 * - Visitante do Brasil: valores em R$ exibem ≈ USD · EUR · CHF
 *
 * Fonte de câmbio: api.frankfurter.app (gratuita, sem chave)
 * Detecção de país: navigator.language (proxy confiável e sem chamada extra)
 */
import { useState, useEffect, useCallback } from 'react';

const RATES_URL = 'https://api.frankfurter.app/latest?from=BRL';

// Mapeamento de locale → moeda principal do usuário
const LOCALE_TO_CURRENCY = {
    'en-US': 'USD', 'en-CA': 'CAD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-NZ': 'NZD',
    'de-DE': 'EUR', 'de-AT': 'EUR', 'de-CH': 'CHF', 'de': 'EUR',
    'fr-FR': 'EUR', 'fr-CH': 'CHF', 'fr-BE': 'EUR', 'fr': 'EUR',
    'it-IT': 'EUR', 'it-CH': 'CHF', 'it': 'EUR',
    'es': 'EUR', 'nl': 'EUR', 'pt-PT': 'EUR',
    'ja': 'JPY', 'ko': 'KRW', 'zh': 'CNY', 'zh-TW': 'TWD',
    'ar': 'AED', 'ru': 'RUB', 'tr': 'TRY', 'pl': 'PLN',
};

function detectUserCurrency() {
    const lang = navigator.language || 'en-US';
    if (LOCALE_TO_CURRENCY[lang]) return LOCALE_TO_CURRENCY[lang];
    const base = lang.split('-')[0];
    return LOCALE_TO_CURRENCY[base] || 'USD';
}

function userIsFromBrazil() {
    const lang = (navigator.language || '').toLowerCase();
    return lang === 'pt-br' || lang.startsWith('pt-b') || lang === 'pt';
}

// Captura: R$ 6.000  |  R$ 14 mil  |  R$ 2,5 milhões  |  R$100.000
const BRL_RE = /R\$\s*([\d.]+(?:,\d+)?)(?:\s*(mil|milh[aã]o|milh[oõ]es|bilh[aã]o|bilh[oõ]es))?/g;

function parseBRL(numStr, word) {
    const clean = numStr.replace(/\./g, '').replace(',', '.');
    const base = parseFloat(clean) || 0;
    const M = {
        'mil': 1e3,
        'milhao': 1e6, 'milhão': 1e6, 'milhaos': 1e6, 'milhões': 1e6,
        'bilhao': 1e9, 'bilhão': 1e9, 'bilhaos': 1e9, 'bilhões': 1e9,
    };
    return base * (M[(word || '').toLowerCase()] || 1);
}

function fmt(value, currency) {
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency,
            maximumFractionDigits: value >= 1000 ? 0 : 2,
        }).format(value);
    } catch {
        return `${currency} ${Math.round(value).toLocaleString()}`;
    }
}

export function useCurrencyConverter() {
    const [rates, setRates] = useState(null);

    useEffect(() => {
        fetch(RATES_URL)
            .then(r => r.json())
            .then(d => setRates(d.rates || {}))
            .catch(() => {});
    }, []);

    const fromBrazil = userIsFromBrazil();
    const userCurrency = detectUserCurrency();

    const convertBRLInText = useCallback((text) => {
        if (!rates || !text || typeof text !== 'string') return text;

        return text.replace(BRL_RE, (match, numStr, multWord) => {
            const brl = parseBRL(numStr, multWord);
            if (brl <= 0) return match;

            if (fromBrazil) {
                const parts = ['USD', 'EUR', 'CHF']
                    .map(cur => (rates[cur] ? fmt(brl * rates[cur], cur) : null))
                    .filter(Boolean)
                    .join(' · ');
                return parts ? `${match} (aprox. ${parts})` : match;
            } else {
                const cur = userCurrency === 'BRL' ? 'USD' : userCurrency;
                const rate = rates[cur];
                if (!rate) return match;
                return `${match} (≈ ${fmt(brl * rate, cur)}, valor aproximado sujeito a variação cambial)`;
            }
        });
    }, [rates, fromBrazil, userCurrency]);

    return { convertBRLInText, ready: !!rates };
}

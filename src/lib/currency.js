
const EXCHANGE_RATE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/brl.json';

let cachedRates = null;
let lastFetch = 0;

export const getExchangeRates = async () => {
    const now = Date.now();
    // Cache for 1 hour
    if (cachedRates && (now - lastFetch < 3600000)) {
        return cachedRates;
    }

    try {
        const response = await fetch(EXCHANGE_RATE_URL);
        const data = await response.json();
        cachedRates = data.brl;
        lastFetch = now;
        return cachedRates;
    } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        return null;
    }
};

export const getUserCurrency = async () => {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return {
            code: data.currency,
            country: data.country_code
        };
    } catch (e) {
        console.error("Failed to detect currency", e);
        return { code: 'BRL', country: 'BR' };
    }
};

export const formatCurrency = (value, currencyCode, locale = 'pt-BR') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
    }).format(value);
};

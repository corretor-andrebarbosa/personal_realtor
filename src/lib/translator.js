// v2 — usa Google Translate como fonte primária (melhor qualidade para PT-BR)
// Cache versionado: ao mudar CACHE_VERSION, traduções antigas são descartadas
const CACHE_VERSION = 'v2';
const CACHE_STORE = `ab-translations-cache-${CACHE_VERSION}`;

// Remove versões antigas do cache
try {
    for (const k of Object.keys(localStorage)) {
        if (k.startsWith('ab-translations-cache') && k !== CACHE_STORE) {
            localStorage.removeItem(k);
        }
    }
} catch (_) {}

const cache = (() => {
    try { return JSON.parse(localStorage.getItem(CACHE_STORE) || '{}'); }
    catch (_) { return {}; }
})();

function saveCache() {
    const keys = Object.keys(cache);
    if (keys.length > 600) delete cache[keys[0]];
    try { localStorage.setItem(CACHE_STORE, JSON.stringify(cache)); } catch (_) {}
}

/**
 * Traduz texto de português para o idioma alvo.
 * Fonte primária: Google Translate (gratuito, boa qualidade para PT-BR).
 * Fallback: MyMemory API.
 */
export const translateText = async (text, targetLang) => {
    if (!text || !targetLang || targetLang === 'pt') return text;

    const cacheKey = `${text}_${targetLang}`;
    if (cache[cacheKey]) return cache[cacheKey];

    // 1) Google Translate (unofficial free endpoint — melhor para PT-BR)
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data?.[0]) {
            // Concatena todos os fragmentos retornados
            const translated = data[0].map(c => c?.[0] || '').join('').trim();
            if (translated && translated !== text) {
                cache[cacheKey] = translated;
                saveCache();
                return translated;
            }
        }
    } catch (_) {}

    // 2) Fallback: MyMemory
    try {
        const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=pt|${targetLang}`
        );
        const data = await res.json();
        const translated = data?.responseData?.translatedText || '';

        if (translated &&
            !translated.toUpperCase().includes('MYMEMORY WARNING') &&
            !translated.includes('https://')) {
            cache[cacheKey] = translated;
            saveCache();
            return translated;
        }
    } catch (_) {}

    return text;
};

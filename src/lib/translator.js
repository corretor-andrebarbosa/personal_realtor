
const cache = JSON.parse(localStorage.getItem('ab-translations-cache') || '{}');

/**
 * Translates text from Portuguese to the target language using MyMemory API.
 * Includes a simple local cache to avoid redundant requests.
 */
export const translateText = async (text, targetLang) => {
    if (!text || !targetLang || targetLang === 'pt') return text;

    // Normalize language codes for MyMemory (e.g., 'es' -> 'es', 'de' -> 'de')
    const langPair = `pt|${targetLang}`;
    const cacheKey = `${text}_${targetLang}`;

    if (cache[cacheKey]) {
        return cache[cacheKey];
    }

    try {
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`
        );
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            const translated = data.responseData.translatedText;
            
            // Don't cache if it looks like an error/warning message from MyMemory
            if (!translated.toUpperCase().includes('MYMEMORY WARNING') && 
                !translated.toUpperCase().includes('ERROR') &&
                !translated.includes('https://')) {
                
                cache[cacheKey] = translated;

                // Limit cache size to avoid localStorage bloat (keep last 500 translations)
                const keys = Object.keys(cache);
                if (keys.length > 500) {
                    delete cache[keys[0]];
                }

                localStorage.setItem('ab-translations-cache', JSON.stringify(cache));
            }
            
            // Return original text if it's an error message, otherwise return translation
            if (translated.toUpperCase().includes('MYMEMORY WARNING') || translated.includes('https://')) {
                return text;
            }
            
            return translated;
        }
    } catch (error) {
        console.error("Translation failed for text:", text, error);
    }

    return text;
};

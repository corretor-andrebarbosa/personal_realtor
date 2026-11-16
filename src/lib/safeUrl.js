/**
 * Devolve a URL só se for http(s); qualquer outro esquema (javascript:, data:…)
 * vira null. Usar em todo href/window.open que venha do banco ou de LLM.
 */
export function safeUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return null;
    try {
        const url = new URL(value, typeof window !== 'undefined' ? window.location.origin : 'https://andrebarbosaimoveis.com');
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

export function getPublicWhatsapp() {
    const fromLocal = (typeof window !== 'undefined')
        ? (localStorage.getItem('ab-whatsapp') || '').trim()
        : '';

    const fromEnv = (import.meta?.env?.VITE_PUBLIC_WHATSAPP || '').trim();

    // prioridade: localStorage (se você setar no admin) > env (padrão público)
    const raw = fromLocal || fromEnv;

    // sanitiza: mantém só dígitos
    return raw.replace(/\D/g, '');
}

export function buildWaMeLink(numberDigits, text) {
    const n = (numberDigits || '').replace(/\D/g, '');
    if (!n) return '';
    const base = `https://wa.me/${n}`;
    if (!text) return base;
    return `${base}?text=${encodeURIComponent(text)}`;
}
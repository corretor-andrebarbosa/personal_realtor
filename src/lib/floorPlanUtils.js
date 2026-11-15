// Regras puras da planta baixa: sem React, sem Supabase e sem acesso direto ao
// navegador, para poderem ser testadas com `npm test` (node --test).

export const FLOOR_PLAN_LANGS = ['pt', 'en', 'de', 'es'];

// Códigos devolvidos pela função request_floor_plan → chave em translations.js
const ERROR_KEYS = {
    consent_required: 'fp_err_consent',
    invalid_name: 'fp_err_name',
    invalid_phone: 'fp_err_phone',
    invalid_email: 'fp_err_email',
    not_available: 'fp_err_unavailable',
};

/** Chave de tradução para um código de erro (rede, limite e desconhecidos caem no genérico). */
export function errorKeyFor(code) {
    return ERROR_KEYS[code] || 'fp_err_generic';
}

/** Remove caracteres de controle e sinais de marcação do nome. */
export function cleanName(value) {
    // eslint-disable-next-line no-control-regex
    return String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
}

export function isValidName(value) {
    const name = cleanName(value);
    return name.length >= 2 && name.length <= 80;
}

/**
 * Normaliza o telefone digitado. Espelha a regra da função request_floor_plan no banco:
 *   "+49 151 ..." ou "0049 151 ..." → internacional, mantém os dígitos
 *   10 ou 11 dígitos sem "+"        → número brasileiro com DDD, recebe o 55
 *
 * @param {string} raw texto como o visitante digitou
 * @param {{ requireCountryCode?: boolean }} [options] exige "+" ou "00" no início
 *        (usado quando o visitante navega em outro idioma, onde não dá para presumir Brasil)
 * @returns {{ valid: boolean, digits: string, international: boolean }}
 *          `digits` já sai com o código do país, pronto para wa.me
 */
export function normalizePhone(raw, { requireCountryCode = false } = {}) {
    const text = String(raw ?? '').trim();
    let digits = text.replace(/\D/g, '');
    const hasPlus = text.startsWith('+');
    const hasDoubleZero = !hasPlus && text.startsWith('00');
    const international = hasPlus || hasDoubleZero;

    if (hasDoubleZero) {
        digits = digits.slice(2);
    } else if (!international && (digits.length === 10 || digits.length === 11)) {
        digits = `55${digits}`;
    }

    const lengthOk = digits.length >= 10 && digits.length <= 15;
    const valid = lengthOk && (!requireCountryCode || international);
    return { valid, digits, international };
}

/** E-mail é opcional: vazio vale; preenchido precisa ter cara de e-mail. */
export function isValidEmail(value) {
    const email = String(value ?? '').trim();
    if (!email) return true;
    return email.length <= 120 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * Devolve uma URL segura para abrir em nova aba, ou '' se não for http(s).
 * Links de arquivo do Google Drive viram a URL de visualização (/view).
 */
export function toOpenableUrl(rawUrl) {
    const url = String(rawUrl ?? '').trim();
    if (!/^https?:\/\//i.test(url)) return '';

    const isGoogleDrive = /^https?:\/\/(drive|docs)\.google\.com\//i.test(url);
    if (isGoogleDrive) {
        const fileId = url.match(/\/file\/d\/([^/?#]+)/)?.[1] || url.match(/[?&]id=([^&#]+)/)?.[1];
        if (fileId) return `https://drive.google.com/file/d/${fileId}/view`;
    }
    return url;
}

// ─── Lembrança local de plantas já liberadas ────────────────────────────────
// Quem já deixou o contato não precisa preencher de novo no mesmo aparelho.
// `storage` é injetado (localStorage no navegador) para o código ser testável.

export const UNLOCK_STORAGE_KEY = 'ab-floor-plans';
export const UNLOCK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function readUnlockMap(storage) {
    try {
        const parsed = JSON.parse(storage.getItem(UNLOCK_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

/** URL liberada para este imóvel neste aparelho, ou '' (inexistente, vencida ou inválida). */
export function readUnlockedFloorPlan(storage, propertyId, now = Date.now()) {
    if (!storage || propertyId == null) return '';
    const entry = readUnlockMap(storage)[String(propertyId)];
    if (!entry || typeof entry.url !== 'string' || typeof entry.at !== 'number') return '';
    if (now - entry.at > UNLOCK_TTL_MS) return '';
    return toOpenableUrl(entry.url);
}

/** Guarda a URL liberada. Nunca lança erro (aba anônima, armazenamento cheio etc.). */
export function rememberUnlockedFloorPlan(storage, propertyId, url, now = Date.now()) {
    if (!storage || propertyId == null || !url) return false;
    try {
        const map = readUnlockMap(storage);
        // descarta entradas vencidas para o registro não crescer sem limite
        for (const key of Object.keys(map)) {
            if (!map[key] || typeof map[key].at !== 'number' || now - map[key].at > UNLOCK_TTL_MS) delete map[key];
        }
        map[String(propertyId)] = { url, at: now };
        storage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(map));
        return true;
    } catch {
        return false;
    }
}

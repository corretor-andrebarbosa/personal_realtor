import { systemConfig } from './system-config';

/**
 * Helper centralizado para abrir Telegram.
 *
 * @param {string} [message] - Mensagem a ser enviada (será URL-encoded)
 * @param {string} [usernameOverride] - Usuário alternativo (sem @)
 */
export function openTelegram(message, usernameOverride) {
    // Prioridade: localStorage (configuração dinâmica) > system-config (estático)
    const username = (usernameOverride
        || localStorage.getItem('ab-telegram')
        || systemConfig.telegramUsername || '').replace(/^@/, '').trim();

    if (!username) {
        alert('Usuário de Telegram não configurado. Vá em Configurações para definir.');
        return;
    }

    const text = message || systemConfig.telegramDefaultMessage;
    const url = `https://t.me/${username}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Retorna a URL do Telegram sem abrir (para uso em href).
 *
 * @param {string} [message]
 * @param {string} [usernameOverride]
 * @returns {string}
 */
export function getTelegramUrl(message, usernameOverride) {
    const username = (usernameOverride
        || localStorage.getItem('ab-telegram')
        || systemConfig.telegramUsername || '').replace(/^@/, '').trim();

    if (!username) return '#contato';

    const text = message || systemConfig.telegramDefaultMessage;
    return `https://t.me/${username}?text=${encodeURIComponent(text)}`;
}

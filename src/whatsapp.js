import { systemConfig } from './system-config';

/**
 * Helper centralizado para abrir WhatsApp.
 * 
 * @param {string} [message] - Mensagem a ser enviada (será URL-encoded)
 * @param {string} [numberOverride] - Número alternativo (formato E.164 sem +)
 */
export function openWhatsApp(message, numberOverride) {
    // Prioridade: localStorage (configuração dinâmica) > system-config (estático)
    const number = numberOverride
        || localStorage.getItem('ab-whatsapp')
        || systemConfig.whatsappNumber;

    if (!number) {
        alert('Número de WhatsApp não configurado. Vá em Configurações para definir.');
        return;
    }

    const text = message || systemConfig.whatsappDefaultMessage;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Retorna a URL do WhatsApp sem abrir (para uso em href).
 * 
 * @param {string} [message]
 * @param {string} [numberOverride]
 * @returns {string}
 */
export function getWhatsAppUrl(message, numberOverride) {
    const number = numberOverride
        || localStorage.getItem('ab-whatsapp')
        || systemConfig.whatsappNumber;

    if (!number) return '#contato';

    const text = message || systemConfig.whatsappDefaultMessage;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

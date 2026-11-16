import { supabase } from './supabaseClient';

/**
 * Envia o lead do formulário de contato público pela RPC validada
 * `submit_contact_lead` (o visitante não tem permissão de ler a tabela leads,
 * então insert + select direto era recusado e o lead se perdia).
 * Retorna { ok: true } ou { ok: false, error }.
 */
export async function submitContactLead({ name, phone, interest, email, lang = 'pt' }) {
    const { data, error } = await supabase.rpc('submit_contact_lead', {
        p_name: name,
        p_phone: phone,
        p_interest: interest || null,
        p_email: email || null,
        p_lang: lang,
    });
    if (error) return { ok: false, error: error.message };
    return data && typeof data === 'object' ? data : { ok: false, error: 'unexpected_response' };
}

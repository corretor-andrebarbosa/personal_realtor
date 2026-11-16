// Planta baixa com captura de lead — acesso ao Supabase.
//
// O link da planta NÃO fica em `properties` (que o site público lê inteira): fica em
// `property_floor_plans`, que o visitante não consegue ler. Para o visitante, o link só
// sai pela função `request_floor_plan`, que grava o lead antes de devolvê-lo.
// Estrutura criada em supabase/migrations/20261115190000_floor_plan_leads.sql.

import { supabase } from './supabaseClient';
import { toOpenableUrl } from './floorPlanUtils';

const TABLE = 'property_floor_plans';

// Resposta da API quando a tabela ou a função ainda não existem no banco
// (migração ainda não aplicada).
const isMissingSchema = (error) => {
    const code = error?.code || '';
    const message = error?.message || '';
    return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(code)
        || /schema cache|does not exist/i.test(message);
};

const isPermissionError = (error) => {
    const code = error?.code || '';
    const message = error?.message || '';
    return code === '42501' || /row-level security|permission denied/i.test(message);
};

/**
 * Visitante: envia o formulário de contato da planta.
 * @returns {Promise<{ ok: true, url: string } | { ok: false, error: string }>}
 *          `error` é o código devolvido pelo banco ou 'network'.
 */
export async function requestFloorPlan({ propertyId, name, phone, email, consent, lang }) {
    try {
        const { data, error } = await supabase.rpc('request_floor_plan', {
            p_property_id: Number(propertyId),
            p_name: name,
            p_phone: phone,
            p_email: email || null,
            p_consent: consent === true,
            p_lang: lang || 'pt',
        });

        if (error) {
            console.warn('[planta baixa] erro ao solicitar:', error.message);
            return { ok: false, error: isMissingSchema(error) ? 'not_available' : 'network' };
        }

        if (data && data.ok === true) {
            const url = toOpenableUrl(data.url);
            return url ? { ok: true, url } : { ok: false, error: 'not_available' };
        }
        return { ok: false, error: (data && data.error) || 'network' };
    } catch (e) {
        console.warn('[planta baixa] falha de rede:', e?.message);
        return { ok: false, error: 'network' };
    }
}

/**
 * Admin autenticado: lê o link cadastrado para o imóvel.
 * Para o visitante a consulta volta vazia (RLS), então pode ser chamada sem risco.
 * @returns {Promise<{ url: string, available: boolean }>}
 *          `available` = false quando o banco ainda não tem a estrutura da planta.
 */
export async function fetchFloorPlanUrl(propertyId) {
    if (propertyId == null || String(propertyId).startsWith('local-')) return { url: '', available: true };
    try {
        const { data, error } = await supabase
            .from(TABLE)
            .select('url')
            .eq('property_id', propertyId)
            .maybeSingle();

        if (error) return { url: '', available: !isMissingSchema(error) };
        return { url: (data && data.url) || '', available: true };
    } catch {
        return { url: '', available: true };
    }
}

/**
 * Admin autenticado: grava o link da planta (ou apaga, se vier vazio).
 * @returns {Promise<true | string>} true ou a mensagem de erro para mostrar na tela
 */
export async function saveFloorPlanUrl(propertyId, rawUrl) {
    if (propertyId == null || String(propertyId).startsWith('local-')) {
        return 'o imóvel ainda não foi sincronizado com a nuvem.';
    }

    const url = String(rawUrl ?? '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
        return 'o link precisa começar com http:// ou https://';
    }

    try {
        const { error } = url
            ? await supabase
                .from(TABLE)
                .upsert(
                    { property_id: propertyId, url, updated_at: new Date().toISOString() },
                    { onConflict: 'property_id' }
                )
            : await supabase.from(TABLE).delete().eq('property_id', propertyId);

        if (!error) return true;
        if (isMissingSchema(error)) return 'o banco de dados ainda não recebeu a atualização da planta baixa.';
        if (isPermissionError(error)) return 'sua sessão expirou. Entre de novo no painel e salve outra vez.';
        return error.message || 'erro desconhecido.';
    } catch (e) {
        return e?.message || 'falha de conexão.';
    }
}

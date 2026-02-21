
import { createClient } from '@supabase/supabase-js';

// As chaves podem vir de variáveis de ambiente do Vite ou LocalStorage
const getKeys = () => {
    // Pegamos ambos
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const localUrl = localStorage.getItem('ab-supabase-url');
    const localKey = localStorage.getItem('ab-supabase-key');

    // Função rigorosa de validação
    const isValid = (val) => {
        if (!val || val === 'undefined' || val === 'null' || val === '') return false;
        if (val.includes('COLOCAR_') || val.includes('YOUR_')) return false;
        return val.length > 10;
    };

    // PRIORIDADE: Se o usuário sincronizou manualmente (local), usamos isso. 
    // Se não, usamos o que veio do sistema (env).
    const finalUrl = isValid(localUrl) ? localUrl : (isValid(envUrl) ? envUrl : null);
    const finalKey = isValid(localKey) ? localKey : (isValid(envKey) ? envKey : null);

    return { supabaseUrl: finalUrl, supabaseAnonKey: finalKey };
};

const { supabaseUrl, supabaseAnonKey } = getKeys();
let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('🌐 Conexão Supabase preparada.');
    } catch (e) {
        console.error('❌ Erro na criação do cliente:', e);
    }
} else {
    console.warn('⚠️ Aguardando chaves de sincronização...');
}

export { supabase, getKeys };

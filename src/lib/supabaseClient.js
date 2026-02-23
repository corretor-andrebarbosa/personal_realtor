import { createClient } from '@supabase/supabase-js';

/**
 * Fonte DEFINITIVA: .env (Vite)
 * Fallback opcional: localStorage (para configurações dinâmicas avançadas).
 */
export const getKeys = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // ✅ prioridade total para .env (definitivo)
  if (envUrl && envAnon) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envAnon, source: 'env' };
  }

  // fallback opcional (não recomendado como definitivo, mas mantido por compatibilidade)
  if (typeof window !== 'undefined') {
    const lsUrl = localStorage.getItem('ab-supabase-url');
    const lsAnon = localStorage.getItem('ab-supabase-anon');
    if (lsUrl && lsAnon) return { supabaseUrl: lsUrl, supabaseAnonKey: lsAnon, source: 'localStorage' };
  }

  return { supabaseUrl: null, supabaseAnonKey: null, source: 'none' };
};

export const setKeys = ({ supabaseUrl, supabaseAnonKey }) => {
  if (typeof window === 'undefined') return false;
  if (!supabaseUrl || !supabaseAnonKey) return false;
  localStorage.setItem('ab-supabase-url', supabaseUrl);
  localStorage.setItem('ab-supabase-anon', supabaseAnon);
  return true;
};

const { supabaseUrl, supabaseAnonKey, source } = getKeys();

// ✅ Otimização: Log amigável para debug
if (source === 'none') {
  console.error('⚠️ ERRO CRÍTICO DE CONFIGURAÇÃO: As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram encontradas no arquivo .env.');
  console.error('Por favor, crie um arquivo .env na raiz do projeto com suas chaves do Supabase.');
}

// ✅ Exporta cliente ou null (tratado nos componentes)
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
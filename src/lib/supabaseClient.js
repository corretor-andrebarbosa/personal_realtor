import { createClient } from '@supabase/supabase-js';

/**
 * Fonte DEFINITIVA: .env (Vite)
 * Fallback opcional: localStorage (para configurações dinâmicas avançadas).
 */
export const getKeys = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Verifica se a chave do env parece um token do Vercel (erro comum) ou placeholder
  const isInvalidEnv = !envAnon || envAnon.includes("COLE_AQUI") || envAnon.includes("RS256");

  // Se o ENV for válido, usa ele
  if (envUrl && envAnon && !isInvalidEnv) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envAnon, source: 'env' };
  }

  // Se o ENV for inválido ou ausente, busca no LocalStorage
  if (typeof window !== 'undefined') {
    const lsUrl = localStorage.getItem('ab-supabase-url') || envUrl;
    const lsAnon = localStorage.getItem('ab-supabase-anon');

    // Só retorna se a chave do LS parecer minimamente válida
    if (lsUrl && lsAnon && lsAnon.length > 50 && !lsAnon.includes("RS256")) {
      return { supabaseUrl: lsUrl, supabaseAnonKey: lsAnon, source: 'localStorage' };
    }
  }

  return { supabaseUrl: envUrl || null, supabaseAnonKey: null, source: 'none' };
};

export const setKeys = ({ supabaseUrl, supabaseAnonKey }) => {
  if (typeof window === 'undefined') return false;
  if (!supabaseUrl || !supabaseAnonKey) return false;

  // Validação básica para evitar salvar lixo
  if (supabaseAnonKey.includes("RS256")) {
    console.error("Tentativa de salvar chave RS256 (Vercel) no lugar da HS256 (Supabase)");
    return false;
  }

  localStorage.setItem('ab-supabase-url', supabaseUrl);
  localStorage.setItem('ab-supabase-anon', supabaseAnonKey);
  return true;
};

const { supabaseUrl, supabaseAnonKey, source } = getKeys();

// Log amigável para debug (visível apenas no console do desenvolvedor)
if (!supabaseAnonKey) {
  console.warn('⚠️ Aguardando configuração do banco de dados (Anon Key ausente ou inválida).');
}

// ✅ Exporta cliente ou null
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 50)
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  : null;
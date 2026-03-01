// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * Fonte principal (produção): ENV do Vite (Cloudflare Pages)
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Fallback (admin avançado): localStorage
 *   ab-supabase-url
 *   ab-supabase-key   <-- (este é o que seu Settings.jsx salva)
 *
 * Observação: mantém compatibilidade com um legado opcional:
 *   ab-supabase-anon
 */

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

const looksLikeSupabaseUrl = (url) =>
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url);

const looksLikeAnonKey = (key) => {
  const k = clean(key);
  // anon key costuma ser um JWT longo (eyJ...) ou algo bem grande
  return k.length > 40 && !k.includes('COLE_AQUI') && !k.includes('RS256');
};

export const getKeys = () => {
  // 1) ENV (build time)
  const envUrl = clean(import.meta?.env?.VITE_SUPABASE_URL);
  const envAnon = clean(import.meta?.env?.VITE_SUPABASE_ANON_KEY);

  if (looksLikeSupabaseUrl(envUrl) && looksLikeAnonKey(envAnon)) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envAnon, source: 'env' };
  }

  // 2) localStorage (runtime)
  if (typeof window !== 'undefined') {
    const lsUrl = clean(localStorage.getItem('ab-supabase-url'));
    const lsKey = clean(
      localStorage.getItem('ab-supabase-key') || localStorage.getItem('ab-supabase-anon')
    );

    if (looksLikeSupabaseUrl(lsUrl) && looksLikeAnonKey(lsKey)) {
      return { supabaseUrl: lsUrl, supabaseAnonKey: lsKey, source: 'localStorage' };
    }
  }

  return { supabaseUrl: '', supabaseAnonKey: '', source: 'none' };
};

export const isSupabaseConfigured = () => {
  const { supabaseUrl, supabaseAnonKey } = getKeys();
  return Boolean(looksLikeSupabaseUrl(supabaseUrl) && looksLikeAnonKey(supabaseAnonKey));
};

// Bucket padrão do Storage (se você usa no projeto)
export const STORAGE_BUCKET = 'property-images';

// Singleton
let client = null;

export const supabase = (() => {
  const { supabaseUrl, supabaseAnonKey, source } = getKeys();

  if (!looksLikeSupabaseUrl(supabaseUrl) || !looksLikeAnonKey(supabaseAnonKey)) {
    // Mantém o app funcionando em modo offline, sem quebrar UI
    if (typeof window !== 'undefined') {
      console.warn('⚠️ Supabase não configurado (ENV/localStorage ausente ou inválido).');
    }
    return null;
  }

  if (client) return client;

  if (typeof window !== 'undefined') {
    console.info(`✅ Supabase configurado via: ${source}`);
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
})();
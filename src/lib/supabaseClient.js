// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client — Cloudflare Pages Ready
 *
 * Ordem de prioridade:
 *   1. Variáveis de ambiente Vite (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *      → Injetadas no build pelo Cloudflare Pages ou .env local
 *   2. localStorage (configuração manual via painel admin)
 */

const clean = (v) =>
  typeof v === 'string' ? v.trim().replace(/[\r\n]/g, '') : '';

const isValidUrl = (url) => {
  const u = clean(url);
  return u.startsWith('https://') && u.includes('.supabase.co');
};

const isValidKey = (key) => {
  const k = clean(key);
  // Anon key é sempre um JWT começando com eyJ
  return k.length > 40 && k.startsWith('eyJ') && !k.includes('COLE_AQUI');
};

export const getKeys = () => {
  // 1) Build-time ENV (Cloudflare Pages ou .env local)
  const envUrl  = clean(import.meta?.env?.VITE_SUPABASE_URL  ?? '');
  const envAnon = clean(import.meta?.env?.VITE_SUPABASE_ANON_KEY ?? '');

  if (isValidUrl(envUrl) && isValidKey(envAnon)) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envAnon, source: 'env' };
  }

  // 2) localStorage (painel admin)
  if (typeof window !== 'undefined') {
    const lsUrl = clean(localStorage.getItem('ab-supabase-url') ?? '');
    const lsKey = clean(
      localStorage.getItem('ab-supabase-key') ??
      localStorage.getItem('ab-supabase-anon') ?? ''
    );

    if (isValidUrl(lsUrl) && isValidKey(lsKey)) {
      return { supabaseUrl: lsUrl, supabaseAnonKey: lsKey, source: 'localStorage' };
    }
  }

  return { supabaseUrl: '', supabaseAnonKey: '', source: 'none' };
};

export const isSupabaseConfigured = () => {
  const { supabaseUrl, supabaseAnonKey } = getKeys();
  return isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey);
};

export const STORAGE_BUCKET = 'property-images';

let _client = null;

const buildClient = () => {
  const { supabaseUrl, supabaseAnonKey, source } = getKeys();

  if (!isValidUrl(supabaseUrl) || !isValidKey(supabaseAnonKey)) {
    if (typeof window !== 'undefined') {
      console.warn('[Supabase] Não configurado.', {
        urlOk: isValidUrl(supabaseUrl),
        keyOk: isValidKey(supabaseAnonKey),
        urlSnippet: supabaseUrl.slice(0, 40),
        keySnippet: supabaseAnonKey.slice(0, 15),
      });
    }
    return null;
  }

  if (_client) return _client;

  if (typeof window !== 'undefined') {
    console.info(`[Supabase] ✅ Conectado via: ${source} | ${supabaseUrl}`);
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    },
  });

  return _client;
};

export const supabase = buildClient();

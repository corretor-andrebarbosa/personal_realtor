// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client — Cloudflare Pages Ready
 *
 * Ordem de prioridade das credenciais:
 *   1. Variáveis de ambiente Vite (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *   2. Fallback hardcoded (garante que o site nunca fica sem cliente)
 */

const FALLBACK_URL = 'https://kavjusgxohdpvkeknyjz.supabase.co';
const FALLBACK_KEY = 'sb_publishable_IJSaRoMEiCXgRDKIDLnvdA_E6rk5wEi';

const clean = (v) =>
  typeof v === 'string' ? v.trim().replace(/[\r\n"]/g, '') : '';

const getSupabaseUrl = () => {
  const envUrl = clean(import.meta?.env?.VITE_SUPABASE_URL ?? '');
  if (envUrl.startsWith('https://') && envUrl.includes('.supabase.co')) return envUrl;
  if (typeof window !== 'undefined') {
    const lsUrl = clean(localStorage.getItem('ab-supabase-url') ?? '');
    if (lsUrl.startsWith('https://') && lsUrl.includes('.supabase.co')) return lsUrl;
  }
  return FALLBACK_URL;
};

const getSupabaseKey = () => {
  const envKey = clean(import.meta?.env?.VITE_SUPABASE_ANON_KEY ?? '');
  if (envKey.length > 20 && !envKey.includes('COLE_AQUI')) return envKey;
  if (typeof window !== 'undefined') {
    const lsKey = clean(
      localStorage.getItem('ab-supabase-key') ??
      localStorage.getItem('ab-supabase-anon') ?? ''
    );
    if (lsKey.length > 20 && !lsKey.includes('COLE_AQUI')) return lsKey;
  }
  return FALLBACK_KEY;
};

export const getKeys = () => ({
  supabaseUrl: getSupabaseUrl(),
  supabaseAnonKey: getSupabaseKey(),
});

export const isSupabaseConfigured = () => true; // sempre configurado com fallback

export const STORAGE_BUCKET = 'property-images';

// Singleton — uma única instância para toda a aplicação
const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

if (typeof window !== 'undefined') {
  console.info(`[Supabase] Conectando | URL: ${supabaseUrl.slice(0, 50)} | Key: ${supabaseAnonKey.slice(0, 20)}...`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * ✔️ Vite: variáveis precisam começar com VITE_
 * Coloque no seu .env (ou .env.local):
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 *
 * Depois: pare e rode o dev server de novo (npm run dev)
 */

export const getKeys = () => {
  // Vite (frontend)
  const supabaseUrl =
    (import.meta?.env?.VITE_SUPABASE_URL || '').trim();

  const supabaseAnonKey =
    (import.meta?.env?.VITE_SUPABASE_ANON_KEY || '').trim();

  return { supabaseUrl, supabaseAnonKey };
};

export const isSupabaseConfigured = () => {
  const { supabaseUrl, supabaseAnonKey } = getKeys();
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Bucket padrão que você criou no Storage
// (mantém em um lugar só para evitar nomes diferentes espalhados no projeto)
export const STORAGE_BUCKET = 'property-images';

let client = null;

export const supabase = (() => {
  const { supabaseUrl, supabaseAnonKey } = getKeys();

  if (!supabaseUrl || !supabaseAnonKey) {
    // Mantém o app funcionando em modo offline
    // (o Login e os Providers já lidam com isso)
    return null;
  }

  // Singleton
  if (client) return client;

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return client;
})();
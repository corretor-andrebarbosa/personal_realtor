import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const TABLE = 'site_settings';
const ROW_ID = 'default';

export const DEFAULT_SITE_SETTINGS = {
  whatsapp: '',
  socials: { instagram: '', linkedin: '', facebook: '', youtube: '', tiktok: '' },
  primary_color: '#166b9c',
  system_prompt: '',
  gemini_key: '',
  groq_key: '',
};

/**
 * Aplica configurações do Supabase no localStorage para que todo o código existente
 * (whatsapp.js, Home.jsx, etc.) continue funcionando sem alterações.
 * Só sobrescreve se o valor do Supabase for não-vazio.
 */
export const applySettingsToLocal = (s) => {
  if (!s) return;
  if (s.whatsapp) localStorage.setItem('ab-whatsapp', s.whatsapp);
  if (s.socials && Object.keys(s.socials).length)
    localStorage.setItem('ab-socials', JSON.stringify(s.socials));
  if (s.primary_color) localStorage.setItem('ab-primary-color', s.primary_color);
  if (s.system_prompt) localStorage.setItem('ab-system-prompt', s.system_prompt);
  if (s.gemini_key) localStorage.setItem('ab-gemini-key', s.gemini_key);
  if (s.groq_key) localStorage.setItem('ab-groq-key', s.groq_key);
};

/**
 * Hook que lê/salva as configurações do site no Supabase.
 * Ao carregar, sincroniza automaticamente o localStorage para que todo
 * o código existente continue funcionando.
 */
export const useSiteSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select('*')
          .eq('id', ROW_ID)
          .maybeSingle();

        if (!error && data) {
          const merged = { ...DEFAULT_SITE_SETTINGS, ...data };
          setSettings(merged);
          applySettingsToLocal(merged);
        } else {
          // Tabela ainda não existe ou está vazia — lê do localStorage como fallback
          setSettings({
            ...DEFAULT_SITE_SETTINGS,
            whatsapp: localStorage.getItem('ab-whatsapp') || '',
            socials: JSON.parse(localStorage.getItem('ab-socials') || '{}'),
            primary_color: localStorage.getItem('ab-primary-color') || '#166b9c',
            system_prompt: localStorage.getItem('ab-system-prompt') || '',
            gemini_key: localStorage.getItem('ab-gemini-key') || '',
            groq_key: localStorage.getItem('ab-groq-key') || '',
          });
        }
      } catch {
        setSettings(DEFAULT_SITE_SETTINGS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveSettings = async (updates) => {
    const next = { ...DEFAULT_SITE_SETTINGS, ...settings, ...updates };
    setSettings(next);
    applySettingsToLocal(next);

    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { ...next, id: ROW_ID, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    return { success: !error, error };
  };

  return { settings, loading, saveSettings };
};

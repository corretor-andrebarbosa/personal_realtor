import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const DEFAULT_DASHBOARD = {
  meta_venda: 1000000,
  meta_locacao: 25000,
  vendas_venda: 0,
  vendas_locacao: 0,
  leads_venda: 0,
  leads_locacao: 0,
  comissoes_venda: 0,
  comissoes_locacao: 0,
  funil_venda: [0, 0, 0, 0],
  funil_locacao: [0, 0, 0, 0],
};

export const useDashboardConfig = () => {
  const [config, setConfig] = useState(DEFAULT_DASHBOARD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('dashboard_config')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();
        if (!error && data) {
          setConfig({
            ...DEFAULT_DASHBOARD,
            ...data,
            funil_venda: Array.isArray(data.funil_venda) ? data.funil_venda : DEFAULT_DASHBOARD.funil_venda,
            funil_locacao: Array.isArray(data.funil_locacao) ? data.funil_locacao : DEFAULT_DASHBOARD.funil_locacao,
          });
        }
      } catch {
        // usa defaults silenciosamente
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveConfig = async (updates) => {
    const next = { ...config, ...updates };
    setConfig(next);
    if (!supabase) return { success: false, error: 'Supabase não configurado' };
    const { error } = await supabase
      .from('dashboard_config')
      .upsert({ ...next, id: 'default', updated_at: new Date().toISOString() }, { onConflict: 'id' });
    return { success: !error, error };
  };

  return { config, loading, saveConfig };
};

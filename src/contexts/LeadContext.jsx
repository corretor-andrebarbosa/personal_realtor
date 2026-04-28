
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { storageManager } from '../lib/storageManager';
import { cookieStorage } from '../lib/cookieStorage';

const LeadContext = createContext();

export const useLeads = () => useContext(LeadContext);

export const LeadProvider = ({ children }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    // Refresh manual - função para atualizar leads
    const refreshLeads = useCallback(async () => {
        console.log('🔄 Atualizando leads...');
        
        try {
            // Tenta Supabase PRIMEIRO (sempre)
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from('leads')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!error && data) {
                        setLeads(data);
                        // Sincroniza com armazenamento local
                        await storageManager.saveLeads(data);
                        await cookieStorage.set(data);
                        console.log('✅ Leads carregados do Supabase:', data.length);
                        return;
                    } else if (error) {
                        console.warn('⚠️ Erro ao carregar do Supabase:', error.message);
                    }
                } catch (supabaseError) {
                    console.warn('⚠️ Erro de conexão com Supabase:', supabaseError.message);
                }
            }

            // Fallback 1: Tenta armazenamento local (IndexedDB + localStorage)
            console.log('🔄 Tentando armazenamento local...');
            const saved = await storageManager.getLeads();
            if (saved && saved.length > 0) {
                setLeads(saved);
                // Sincroniza com cookies para compartilhar
                await cookieStorage.set(saved);
                console.log('✅ Leads carregados do armazenamento local:', saved.length);
                return;
            }

            // Fallback 2: Tenta cookies compartilhados (última opção)
            console.log('🔄 Tentando cookies compartilhados...');
            const cookieData = await cookieStorage.get();
            if (cookieData && cookieData.length > 0) {
                setLeads(cookieData);
                console.log('✅ Leads carregados de cookie compartilhado:', cookieData.length);
                return;
            }

            // Nada encontrado em nenhum lugar
            setLeads([]);
            console.log('ℹ️ Nenhum lead salvo em nenhum lugar');
        } catch (error) {
            console.error('❌ Erro crítico ao carregar leads:', error);
            setLeads([]);
        }
    }, []);

    // Initial Load + Real-time Subscription
    useEffect(() => {
        const loadLeadsWithSubscription = async () => {
            setLoading(true);
            await refreshLeads();
            setLoading(false);

            // Subscribe to real-time changes (non-critical, se falhar usa localStorage)
            if (supabase) {
                try {
                    const channel = supabase
                        .channel('leads-changes')
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'leads',
                            },
                            (payload) => {
                                console.log('🔄 Lead atualizado em tempo real:', payload);
                                if (payload.eventType === 'INSERT') {
                                    setLeads(prev => [payload.new, ...prev]);
                                } else if (payload.eventType === 'UPDATE') {
                                    setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
                                } else if (payload.eventType === 'DELETE') {
                                    setLeads(prev => prev.filter(l => l.id !== payload.old.id));
                                }
                            }
                        )
                        .subscribe((status) => {
                            if (status === 'SUBSCRIBED') {
                                console.log('✅ Real-time subscription ativa para leads');
                            } else if (status === 'CLOSED') {
                                console.warn('⚠️ Real-time subscription fechada');
                            }
                        });

                    return () => {
                        supabase.removeChannel(channel);
                    };
                } catch (error) {
                    console.warn('⚠️ Não foi possível ativar real-time:', error.message);
                }
            }
        };

        loadLeadsWithSubscription();
    }, [refreshLeads]);

    // Sync to IndexedDB/localStorage/cookies
    useEffect(() => {
        if (!loading && leads.length >= 0) {
            storageManager.saveLeads(leads).catch(error => {
                console.error('Erro ao sincronizar em storage local:', error);
            });
            
            // Sincroniza também em cookies (compartilhado entre abas)
            cookieStorage.set(leads).catch(error => {
                console.error('Erro ao sincronizar em cookie:', error);
            });
        }
    }, [leads, loading]);

    const addLead = async (lead) => {
        const tempId = Date.now();
        const newLead = { ...lead, id: tempId, created_at: new Date().toISOString() };

        // Otimista - mostra imediatamente
        setLeads(prev => [newLead, ...prev]);

        // Tenta Supabase PRIMEIRO (principal)
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .insert([{
                        name: lead.name,
                        phone: lead.phone,
                        interest: lead.interest,
                        budget: lead.budget,
                        status: lead.status,
                        avatar: lead.avatar
                    }])
                    .select();

                if (!error && data && data[0]) {
                    setLeads(prev => prev.map(l => l.id === tempId ? data[0] : l));
                    // Sincroniza em todos os lugares
                    await storageManager.saveLeads(data);
                    await cookieStorage.set(data);
                    console.log('✅ Lead salvo no Supabase:', data[0]);
                    return;
                } else if (error) {
                    console.warn('⚠️ Erro ao salvar no Supabase:', error.message);
                }
            } catch (e) {
                console.error('❌ Erro ao conectar Supabase:', e);
            }
        }

        // Se Supabase falhar, salva localmente + cookies
        try {
            const allLeads = [newLead, ...leads];
            await storageManager.saveLeads(allLeads);
            await cookieStorage.set(allLeads);
            console.log('⚠️ Lead salvo APENAS localmente + cookie (sem conexão Supabase):', newLead);
        } catch (e) {
            console.error('❌ Erro ao salvar no armazenamento local:', e);
        }
    };

    const updateLead = async (id, updated) => {
        setLeads(prev => prev.map(l => l.id == id ? { ...l, ...updated } : l));

        if (supabase) {
            try {
                await supabase
                    .from('leads')
                    .update(updated)
                    .match({ id });
            } catch (e) {
                console.error('Erro ao atualizar lead no Supabase:', e);
            }
        }
    };

    const deleteLead = async (id) => {
        setLeads(prev => prev.filter(l => l.id != id));

        if (supabase) {
            try {
                await supabase
                    .from('leads')
                    .delete()
                    .match({ id });
            } catch (e) {
                console.error('Erro ao excluir lead no Supabase:', e);
            }
        }
    };

    return (
        <LeadContext.Provider value={{ leads, loading, addLead, updateLead, deleteLead, refreshLeads }}>
            {children}
        </LeadContext.Provider>
    );
};

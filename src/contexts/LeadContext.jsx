
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const LeadContext = createContext();

export const useLeads = () => useContext(LeadContext);

export const LeadProvider = ({ children }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    // Refresh manual - função para atualizar leads
    const refreshLeads = useCallback(async () => {
        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setLeads(data);
                    return;
                }
            }

            const saved = localStorage.getItem('ab-leads');
            setLeads(saved ? JSON.parse(saved) : []);
        } catch (error) {
            console.error('Erro ao carregar leads:', error);
            setLeads([]);
        }
    }, []);

    // Initial Load + Real-time Subscription
    useEffect(() => {
        const loadLeadsWithSubscription = async () => {
            setLoading(true);
            await refreshLeads();
            setLoading(false);

            // Subscribe to real-time changes
            if (supabase) {
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
                            console.log('Lead atualizado em tempo real:', payload);
                            if (payload.eventType === 'INSERT') {
                                setLeads(prev => [payload.new, ...prev]);
                            } else if (payload.eventType === 'UPDATE') {
                                setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
                            } else if (payload.eventType === 'DELETE') {
                                setLeads(prev => prev.filter(l => l.id !== payload.old.id));
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            }
        };

        loadLeadsWithSubscription();
    }, [refreshLeads]);

    // Sync to LocalStorage as backup
    useEffect(() => {
        if (!loading && leads.length > 0) {
            localStorage.setItem('ab-leads', JSON.stringify(leads));
        }
    }, [leads, loading]);

    const addLead = async (lead) => {
        const tempId = Date.now();
        const newLead = { ...lead, id: tempId, created_at: new Date().toISOString() };

        setLeads(prev => [newLead, ...prev]);

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .insert([lead])
                    .select();

                if (!error && data) {
                    setLeads(prev => prev.map(l => l.id === tempId ? data[0] : l));
                }
            } catch (e) {
                console.error('Erro ao salvar lead no Supabase:', e);
            }
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

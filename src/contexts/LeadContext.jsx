
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const LeadContext = createContext();

export const useLeads = () => useContext(LeadContext);

export const LeadProvider = ({ children }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    const defaultLeads = [
        {
            id: 1,
            name: 'Roberto Silva',
            phone: '5581999990000',
            interest: 'Edifício Horizon',
            status: 'Quente',
            lastContact: 'Hoje, 09:30',
            budget: 'R$ 1.2M',
            archived: false,
            avatar: 'https://ui-avatars.com/api/?name=Roberto+Silva&background=cbd5e1&color=334155'
        },
        {
            id: 2,
            name: 'Mariana Costa',
            phone: '5581988881111',
            interest: 'Casa Jardim do Sol',
            status: 'Agendado',
            lastContact: 'Ontem',
            budget: 'R$ 900k',
            archived: false,
            avatar: 'https://ui-avatars.com/api/?name=Mariana+Costa&background=fce7f3&color=db2777'
        }
    ];

    // Initial Load
    useEffect(() => {
        const loadLeads = async () => {
            setLoading(true);
            try {
                if (supabase) {
                    const { data, error } = await supabase
                        .from('leads')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!error && data && data.length > 0) {
                        setLeads(data);
                        setLoading(false);
                        return;
                    }
                }

                const saved = localStorage.getItem('ab-leads');
                if (saved) {
                    setLeads(JSON.parse(saved));
                } else {
                    setLeads(defaultLeads);
                }
            } catch (error) {
                console.error('Erro ao carregar leads:', error);
                setLeads(defaultLeads);
            } finally {
                setLoading(false);
            }
        };

        loadLeads();
    }, []);

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
        <LeadContext.Provider value={{ leads, loading, addLead, updateLead, deleteLead }}>
            {children}
        </LeadContext.Provider>
    );
};

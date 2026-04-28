import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const PeopleContext = createContext();

export const usePeople = () => useContext(PeopleContext);

export const PeopleProvider = ({ children }) => {
    const [people, setPeople] = useState({
        clientes: [],
        corretores: [],
        colaboradores: [],
    });
    const [loading, setLoading] = useState(true);

    // Refresh manual - função para atualizar people
    const refreshPeople = useCallback(async () => {
        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('people')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    // Organize por tipo
                    const organized = {
                        clientes: data.filter(p => p.type === 'cliente'),
                        corretores: data.filter(p => p.type === 'corretor'),
                        colaboradores: data.filter(p => p.type === 'colaborador'),
                    };
                    setPeople(organized);
                    return;
                }
            }

            // Fallback para localStorage
            const saved = localStorage.getItem('ab-people');
            setPeople(saved ? JSON.parse(saved) : {
                clientes: [],
                corretores: [],
                colaboradores: [],
            });
        } catch (error) {
            console.error('Erro ao carregar people:', error);
            const saved = localStorage.getItem('ab-people');
            setPeople(saved ? JSON.parse(saved) : {
                clientes: [],
                corretores: [],
                colaboradores: [],
            });
        }
    }, []);

    // Initial Load + Real-time Subscription
    useEffect(() => {
        const loadPeopleWithSubscription = async () => {
            setLoading(true);
            await refreshPeople();
            setLoading(false);

            // Subscribe to real-time changes
            if (supabase) {
                const channel = supabase
                    .channel('people-changes')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'people',
                        },
                        (payload) => {
                            console.log('People atualizado em tempo real:', payload);
                            if (payload.eventType === 'INSERT') {
                                setPeople(prev => {
                                    const updated = { ...prev };
                                    const type = payload.new.type || 'clientes';
                                    updated[type] = [payload.new, ...updated[type]];
                                    return updated;
                                });
                            } else if (payload.eventType === 'UPDATE') {
                                setPeople(prev => {
                                    const updated = { ...prev };
                                    const oldType = payload.old.type || 'clientes';
                                    const newType = payload.new.type || 'clientes';
                                    
                                    // Remove do tipo antigo se mudou
                                    if (oldType !== newType) {
                                        updated[oldType] = updated[oldType].filter(p => p.id !== payload.new.id);
                                    }
                                    
                                    // Atualiza no novo tipo
                                    updated[newType] = updated[newType].map(p => 
                                        p.id === payload.new.id ? payload.new : p
                                    );
                                    return updated;
                                });
                            } else if (payload.eventType === 'DELETE') {
                                setPeople(prev => {
                                    const updated = { ...prev };
                                    const type = payload.old.type || 'clientes';
                                    updated[type] = updated[type].filter(p => p.id !== payload.old.id);
                                    return updated;
                                });
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            }
        };

        loadPeopleWithSubscription();
    }, [refreshPeople]);

    // Sync to LocalStorage as backup
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('ab-people', JSON.stringify(people));
        }
    }, [people, loading]);

    const addPerson = async (type, person) => {
        const tempId = Date.now();
        const newPerson = { ...person, id: tempId, type, created_at: new Date().toISOString() };

        setPeople(prev => ({
            ...prev,
            [type]: [newPerson, ...prev[type]]
        }));

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('people')
                    .insert([newPerson])
                    .select();

                if (!error && data) {
                    setPeople(prev => ({
                        ...prev,
                        [type]: prev[type].map(p => p.id === tempId ? data[0] : p)
                    }));
                }
            } catch (e) {
                console.error('Erro ao salvar person no Supabase:', e);
            }
        }
    };

    const updatePerson = async (type, id, updated) => {
        setPeople(prev => ({
            ...prev,
            [type]: prev[type].map(p => p.id === id ? { ...p, ...updated } : p)
        }));

        if (supabase) {
            try {
                await supabase
                    .from('people')
                    .update(updated)
                    .match({ id });
            } catch (e) {
                console.error('Erro ao atualizar person no Supabase:', e);
            }
        }
    };

    const deletePerson = async (type, id) => {
        setPeople(prev => ({
            ...prev,
            [type]: prev[type].filter(p => p.id !== id)
        }));

        if (supabase) {
            try {
                await supabase
                    .from('people')
                    .delete()
                    .match({ id });
            } catch (e) {
                console.error('Erro ao excluir person no Supabase:', e);
            }
        }
    };

    return (
        <PeopleContext.Provider value={{ 
            people, 
            loading, 
            addPerson, 
            updatePerson, 
            deletePerson, 
            refreshPeople 
        }}>
            {children}
        </PeopleContext.Provider>
    );
};

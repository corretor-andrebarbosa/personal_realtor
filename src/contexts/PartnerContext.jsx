
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const PartnerContext = createContext();

export const usePartners = () => useContext(PartnerContext);

export const PartnerProvider = ({ children }) => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPartners = async () => {
        setLoading(true);
        if (supabase) {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) setPartners(data);
        }
        setLoading(false);
    };

    useEffect(() => { loadPartners(); }, []);

    const addPartner = async (partner) => {
        if (!supabase) return false;
        const { data, error } = await supabase.from('partners').insert([partner]).select();
        if (!error && data) {
            setPartners(prev => [data[0], ...prev]);
            return true;
        }
        return error?.message || 'Erro ao salvar';
    };

    const updatePartner = async (id, updated) => {
        if (!supabase) return false;
        const payload = { ...updated, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('partners').update(payload).eq('id', id);
        if (!error) {
            setPartners(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
            return true;
        }
        return error?.message || 'Erro ao atualizar';
    };

    const deletePartner = async (id) => {
        setPartners(prev => prev.filter(p => p.id !== id));
        if (supabase) await supabase.from('partners').delete().eq('id', id);
    };

    return (
        <PartnerContext.Provider value={{ partners, loading, addPartner, updatePartner, deletePartner, refreshPartners: loadPartners }}>
            {children}
        </PartnerContext.Provider>
    );
};

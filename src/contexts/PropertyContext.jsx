
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getKeys } from '../lib/supabaseClient';

const PropertyContext = createContext();

export const useProperties = () => useContext(PropertyContext);

export const PropertyProvider = ({ children }) => {
    // 0. Inicialização persistente (Evita sumiço no F5)
    const [properties, setProperties] = useState(() => {
        if (typeof window === 'undefined') return [];
        const cached = localStorage.getItem('ab-properties');
        try {
            return cached ? JSON.parse(cached) : [];
        } catch (e) { return []; }
    });

    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [dbSchema, setDbSchema] = useState(() => {
        const cached = localStorage.getItem('ab-db-schema');
        return cached ? JSON.parse(cached) : null;
    });

    // 1. Scanner de Colunas Reforçado (com fallback real)
    // Problema observado: quando o scanner falha, o payload vira "mínimo" e o imóvel some da Home
    // (status/valores/área/imagens/vídeo não são persistidos no banco). Este scanner tenta 3 estratégias.
    const discoverSchema = useCallback(async () => {
        const { supabaseUrl, supabaseAnonKey } = getKeys();
        if (!supabaseUrl || !supabaseAnonKey) return dbSchema;

        // 1) PostgREST OpenAPI (nem sempre habilitado / pode falhar por CORS)
        try {
            const resp = await fetch(`${supabaseUrl}/rest/v1/`, {
                headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
            });
            const data = await resp.json();
            if (data && data.definitions && data.definitions.properties) {
                const cols = Object.keys(data.definitions.properties.properties);
                setDbSchema(cols);
                localStorage.setItem('ab-db-schema', JSON.stringify(cols));
                return cols;
            }
        } catch (e) {
            // segue para fallback
        }

        // 2) Fallback: pega 1 linha e deriva chaves (funciona quando já existem imóveis)
        try {
            if (supabase) {
                const { data, error } = await supabase.from('properties').select('*').limit(1);
                if (!error && Array.isArray(data) && data.length > 0) {
                    const cols = Object.keys(data[0] || {});
                    if (cols.length > 0) {
                        setDbSchema(cols);
                        localStorage.setItem('ab-db-schema', JSON.stringify(cols));
                        return cols;
                    }
                }
            }
        } catch (e) {
            // segue
        }

        // 3) Último recurso: usa cache anterior
        return dbSchema;
    }, [dbSchema]);

    // Remove colunas inexistentes (Supabase schema cache) e tenta novamente.
    // Isto evita o cenário "salvou no form, mas após refresh some/volta incompleto".
    const extractMissingColumn = (message = '') => {
        // Exemplos comuns:
        // - "Could not find the 'salePrice' column of 'properties' in the schema cache"
        // - "column \"salePrice\" of relation \"properties\" does not exist"
        const m1 = message.match(/Could not find the '([^']+)' column/i);
        if (m1 && m1[1]) return m1[1];
        const m2 = message.match(/column\s+"([^"]+)"\s+of\s+relation/i);
        if (m2 && m2[1]) return m2[1];
        const m3 = message.match(/unknown\s+field\s+"([^"]+)"/i);
        if (m3 && m3[1]) return m3[1];
        return null;
    };

    const shouldRetryWithStringifiedImages = (message = '') => {
        // Quando a coluna é text e mandamos array/jsonb errada
        return /invalid input syntax|type json|expects.*text|cannot cast/i.test(message) && /images|gallery/i.test(message);
    };

    const loadProperties = async () => {
        setIsSyncing(true);
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('properties')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    const normalized = data.map(p => ({
                        ...p,
                        // Normalização 360° - Garante que todas as versões do nome existam
                        salePrice: p.sale_price ?? p.salePrice ?? p.price ?? 0,
                        price: p.price ?? p.sale_price ?? p.salePrice ?? 0,
                        rentalPrice: p.rental_price ?? p.rentalPrice ?? 0,

                        // Metragem
                        area: p.area ?? p.total_area ?? p.m2 ?? p.square_meters ?? 0,

                        // Vídeos
                        videoLink: p.video_link ?? p.video_url ?? p.videoLink ?? p.video ?? p.youtube_url ?? '',

                        // Normalização Avançada de Imagens
                        images: (function () {
                            const raw = p.images ?? p.gallery ?? p.fotos ?? [];
                            if (Array.isArray(raw)) return raw;
                            if (typeof raw === 'string') {
                                try {
                                    const parsed = JSON.parse(raw);
                                    return Array.isArray(parsed) ? parsed : [raw];
                                } catch (e) {
                                    if (raw.startsWith('{') && raw.endsWith('}')) {
                                        return raw.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                                    }
                                    return [raw];
                                }
                            }
                            return [];
                        })(),
                        image: p.image ?? p.image_url ?? p.main_image ?? p.capa ?? p.foto_principal ?? ''
                    }));

                    const fullyNormalized = normalized.map(p => ({
                        ...p,
                        image: p.image || (p.images.length > 0 ? p.images[0] : '')
                    }));

                    // Preserva itens locais ou que estão em processo de edição
                    setProperties(prev => {
                        const localOnly = prev.filter(p => p._isLocal || p._isEditing);
                        const cloudIds = new Set(data.map(cp => cp.id));
                        // Removemos da nuvem os IDs que estamos editando localmente para evitar overwrite
                        const cloudFiltered = fullyNormalized.filter(cp => !prev.some(lp => lp.id === cp.id && lp._isEditing));
                        return [...localOnly.filter(lp => !cloudIds.has(lp.id) || lp._isEditing), ...cloudFiltered];
                    });
                }
            } catch (e) {
                console.error('Falha ao carregar nuvem:', e);
            }
        }
        setIsSyncing(false);
        setLoading(false);
    };

    // Helper Universal para preparar dados para o banco (Redundância Total)
    const buildUniversalPayload = (data, cols) => {
        // Objeto com todas as combinações possíveis de nomes de colunas
        const mapping = {
            title: data.title,
            description: data.description,
            address: data.address,
            status: data.status || 'Disponível',
            contract: data.contract,
            type: data.type,

            // Metragem
            area: Number(data.area || 0),
            total_area: Number(data.area || 0),
            m2: Number(data.area || 0),
            square_meters: Number(data.area || 0),

            rooms: Number(data.rooms || 0),
            bathrooms: Number(data.bathrooms || 0),
            garage: Number(data.garage || 0),

            image: data.image,
            image_url: data.image,
            main_image: data.image,
            images: data.images,
            gallery: data.images,

            // Preços
            price: (data.contract === 'venda' || data.contract === 'ambos') ? Number(data.salePrice || data.price || 0) : 0,
            salePrice: (data.contract === 'venda' || data.contract === 'ambos') ? Number(data.salePrice || 0) : 0,
            sale_price: (data.contract === 'venda' || data.contract === 'ambos') ? Number(data.salePrice || 0) : 0,
            rentalPrice: (data.contract === 'locacao' || data.contract === 'ambos') ? Number(data.rentalPrice || 0) : 0,
            rental_price: (data.contract === 'locacao' || data.contract === 'ambos') ? Number(data.rentalPrice || 0) : 0,

            // Vídeos
            videoLink: data.videoLink || '',
            video_link: data.videoLink || '',
            video_url: data.videoLink || '',
            video: data.videoLink || ''
        };

        // Se conhecemos as colunas, filtramos com segurança.
        if (cols && cols.length > 0) {
            const colSet = new Set(cols);
            const finalPayload = {};
            Object.keys(mapping).forEach(key => {
                if (colSet.has(key)) finalPayload[key] = mapping[key];
            });

            // Garantia: Se o mapping não pegou nada essencial
            if (!finalPayload.title) return { title: data.title, price: mapping.price, image: data.image };
            return finalPayload;
        }

        // Se NÃO sabemos as colunas, retornamos o mapping completo.
        // A segurança de colunas desconhecidas será tratada por um "insert/update" adaptativo.
        return mapping;
    };

    const insertAdaptive = async (basePayload) => {
        if (!supabase) return { data: null, error: { message: 'Supabase indisponível' } };
        let payload = { ...basePayload };
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

        for (let attempt = 0; attempt < 10; attempt++) {
            const { data, error } = await supabase.from('properties').insert([payload]).select();
            if (!error) return { data, error: null };

            const missing = extractMissingColumn(error.message || '');
            if (missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
                delete payload[missing];
                continue;
            }

            if (shouldRetryWithStringifiedImages(error.message || '') && payload.images && Array.isArray(payload.images)) {
                payload = { ...payload, images: JSON.stringify(payload.images) };
                continue;
            }

            return { data: null, error };
        }
        return { data: null, error: { message: 'Falha após várias tentativas (schema inconsistente).' } };
    };

    const updateAdaptive = async (id, basePayload) => {
        if (!supabase) return { error: { message: 'Supabase indisponível' } };
        let payload = { ...basePayload };
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

        for (let attempt = 0; attempt < 10; attempt++) {
            const { error } = await supabase.from('properties').update(payload).eq('id', id);
            if (!error) return { error: null };

            const missing = extractMissingColumn(error.message || '');
            if (missing && Object.prototype.hasOwnProperty.call(payload, missing)) {
                delete payload[missing];
                continue;
            }

            if (shouldRetryWithStringifiedImages(error.message || '') && payload.images && Array.isArray(payload.images)) {
                payload = { ...payload, images: JSON.stringify(payload.images) };
                continue;
            }

            return { error };
        }
        return { error: { message: 'Falha após várias tentativas (schema inconsistente).' } };
    };

    useEffect(() => {
        const init = async () => {
            const cols = await discoverSchema();
            await loadProperties();
        };
        init();

        if (supabase) {
            const subscription = supabase
                .channel('properties_realtime_v20')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
                    loadProperties();
                })
                .subscribe();
            return () => { supabase.removeChannel(subscription); };
        }
    }, [discoverSchema]);

    useEffect(() => {
        if (!loading) {
            try {
                localStorage.setItem('ab-properties', JSON.stringify(properties));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    // Se estourar o localStorage (muitas fotos), salvamos sem as imagens para manter a estrutura
                    const lightProps = properties.map(p => ({ ...p, images: p.images.slice(0, 1) }));
                    try {
                        localStorage.setItem('ab-properties', JSON.stringify(lightProps));
                    } catch (e2) {
                        console.error('LocalStorage falhou gravemente:', e2);
                    }
                }
            }
        }
    }, [properties, loading]);

    const syncItem = useCallback(async (localProp) => {
        if (!supabase) return false;
        let cols = dbSchema || await discoverSchema();

        try {
            const payload = buildUniversalPayload(localProp, cols);
            const { data, error } = await insertAdaptive(payload);

            if (!error && data) {
                const synced = {
                    ...data[0],
                    salePrice: data[0].sale_price ?? data[0].salePrice ?? data[0].price,
                    price: data[0].price ?? data[0].sale_price ?? data[0].salePrice,
                    rentalPrice: data[0].rental_price ?? data[0].rentalPrice ?? 0,
                    videoLink: data[0].video_link ?? data[0].videoLink ?? data[0].video,
                    image: data[0].image ?? data[0].image_url ?? data[0].main_image,
                    images: Array.isArray(data[0].images) ? data[0].images : (Array.isArray(data[0].gallery) ? data[0].gallery : []),
                    _isLocal: false,
                    _isEditing: false
                };
                setProperties(prev => prev.map(p => p.id === localProp.id ? synced : p));
                return true;
            }
            if (error) {
                setProperties(prev => prev.map(p => p.id === localProp.id ? { ...p, sync_error: 'Falha: ' + error.message, _isEditing: false } : p));
            }
        } catch (e) {
            setProperties(prev => prev.map(p => p.id === localProp.id ? { ...p, sync_error: 'Erro de Rede (Payload grande?)', _isEditing: false } : p));
        }
        return false;
    }, [dbSchema, discoverSchema]);

    const addProperty = async (property) => {
        const tempId = `local-${Date.now()}`;
        const newProp = { ...property, id: tempId, _isLocal: true, _isEditing: true, created_at: new Date().toISOString() };
        setProperties(prev => [newProp, ...prev]);
        return await syncItem(newProp);
    };

    const updateProperty = async (id, updated) => {
        // Marca como em edição para evitar overwrite do realtime
        setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updated, _isEditing: true } : p));

        // Se ainda é um item local (id começando com local-), ele não existe na nuvem.
        // Então não faz sentido tentar UPDATE: o correto é tentar sincronizar (INSERT) de novo.
        if (String(id).startsWith('local-')) {
            try {
                const current = properties.find(p => p.id === id) || { id };
                const merged = { ...current, ...updated, id, _isLocal: true, _isEditing: true };
                return await syncItem(merged);
            } catch (e) {
                setProperties(prev => prev.map(p => p.id === id ? { ...p, sync_error: 'Falha ao sincronizar item local', _isEditing: false } : p));
                return false;
            }
        }

        if (supabase && !String(id).startsWith('local-')) {
            try {
                let cols = dbSchema || await discoverSchema();
                const payload = buildUniversalPayload(updated, cols);
                const { error } = await updateAdaptive(id, payload);
                if (!error) {
                    setProperties(prev => prev.map(p => p.id === id ? { ...p, _isEditing: false } : p));
                    return true;
                } else {
                    setProperties(prev => prev.map(p => p.id === id ? { ...p, sync_error: error.message, _isEditing: false } : p));
                }
            } catch (e) {
                setProperties(prev => prev.map(p => p.id === id ? { ...p, sync_error: 'Falha na atualização', _isEditing: false } : p));
            }
        }
        return false;
    };

    const deleteProperty = async (id) => {
        setProperties(prev => prev.filter(p => p.id !== id));
        if (supabase && !String(id).startsWith('local-')) {
            try { await supabase.from('properties').delete().eq('id', id); } catch (e) { }
        }
    };

    return (
        <PropertyContext.Provider value={{ properties, loading, isSyncing, dbSchema, addProperty, updateProperty, deleteProperty, refreshProperties: loadProperties, syncItem }}>
            {children}
        </PropertyContext.Provider>
    );
};

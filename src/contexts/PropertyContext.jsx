import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getKeys } from '../lib/supabaseClient';

const PropertyContext = createContext();

export const useProperties = () => useContext(PropertyContext);

export const PropertyProvider = ({ children }) => {
    // Inicialização segura (evita erros de JSON corrompido no localStorage)
    const [properties, setProperties] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            const cached = localStorage.getItem('ab-properties');
            return cached ? JSON.parse(cached) : [];
        } catch (e) {
            // Se o cache estiver corrompido, limpa e retorna vazio
            localStorage.removeItem('ab-properties');
            return [];
        }
    });

    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [dbSchema, setDbSchema] = useState(() => {
        try {
            const cached = localStorage.getItem('ab-db-schema');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });

    // Schema Discovery com Fallback Hardcoded (caso a API falhe)
    const discoverSchema = useCallback(async () => {
        const { supabaseUrl, supabaseAnonKey } = getKeys();
        if (!supabaseUrl || !supabaseAnonKey) return dbSchema;

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
        } catch (e) { /* ignora */ }

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
        } catch (e) { /* ignora */ }

        // Fallback fixo (colunas comuns) para garantir que o sistema funcione mesmo offline/falha
        return ['id', 'title', 'price', 'sale_price', 'rental_price', 'area', 'rooms', 'bathrooms', 'garage', 'address', 'description', 'images', 'image', 'video_url', 'contract', 'status', 'created_at'];
    }, [dbSchema]);

    const extractMissingColumn = (message = '') => {
        const m1 = message.match(/Could not find the '([^']+)' column/i);
        if (m1 && m1[1]) return m1[1];
        const m2 = message.match(/column\s+"([^"]+)"\s+of\s+relation/i);
        if (m2 && m2[1]) return m2[1];
        return null;
    };

    const shouldRetryWithStringifiedImages = (message = '') => {
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
                        // Normalização de Preços
                        salePrice: p.sale_price ?? p.salePrice ?? p.price ?? 0,
                        price: p.price ?? p.sale_price ?? p.salePrice ?? 0,
                        rentalPrice: p.rental_price ?? p.rentalPrice ?? 0,

                        // Normalização de Área
                        area: p.area ?? p.total_area ?? p.m2 ?? p.square_meters ?? 0,

                        // Normalização de Vídeo
                        videoLink: p.video_link ?? p.video_url ?? p.videoLink ?? p.video ?? '',

                        // Normalização de Imagens
                        images: (function () {
                            const raw = p.images ?? p.gallery ?? [];
                            if (Array.isArray(raw)) return raw;
                            if (typeof raw === 'string') {
                                try {
                                    const parsed = JSON.parse(raw);
                                    return Array.isArray(parsed) ? parsed : [raw];
                                } catch (e) {
                                    if (raw.startsWith('{') && raw.endsWith('}')) {
                                        return raw.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
                                    }
                                    return [raw];
                                }
                            }
                            return [];
                        })(),
                        image: p.image ?? p.image_url ?? p.main_image ?? p.capa ?? ''
                    }));

<<<<<<< HEAD
                    const optimizeImageUrl = (url) => {
    if (!url) return '';

    // Se for imagem do Supabase Storage
    if (url.includes('/storage/v1/object/public/')) {
        // Adiciona transformação automática de tamanho
        return `${url}?width=1200&quality=70`;
    }

    return url;
};

const fullyNormalized = normalized.map(p => {
    const mainImage = p.image || (p.images.length > 0 ? p.images[0] : '');

    return {
        ...p,
        image: optimizeImageUrl(mainImage),
        images: p.images.map(optimizeImageUrl)
    };
});
=======
                    // Otimização de URLs (não quebra base64, mas otimiza storage)
                    const optimizeImageUrl = (url) => {
                        if (!url) return '';
                        if (url.includes('/storage/v1/object/public/')) {
                            return `${url}?width=1200&quality=70`;
                        }
                        return url;
                    };
>>>>>>> da43ae91d6726ce15ea8e715ca4648eb30dfa935

                    const fullyNormalized = normalized.map(p => {
                        const mainImage = p.image || (p.images.length > 0 ? p.images[0] : '');
                        return {
                            ...p,
                            image: optimizeImageUrl(mainImage),
                            images: p.images.map(optimizeImageUrl)
                        };
                    });

                    setProperties(prev => {
                        const localOnly = prev.filter(p => String(p.id).startsWith('local-') || p._isLocal);
                        // Evita duplicatas se algum já estiver no cloud
                        const filteredLocal = localOnly.filter(lp => !fullyNormalized.find(fp => fp.id === lp.id));
                        return [...fullyNormalized, ...filteredLocal];
                    });
                } else if (error) {
                    console.error("Erro ao carregar propriedades:", error);
                }
            } catch (e) {
                console.error('Falha crítica ao carregar nuvem:', e);
            }
        }
        setIsSyncing(false);
        setLoading(false);
    };

    const buildUniversalPayload = (data, cols) => {
        const mapping = {
            title: data.title,
            description: data.description,
            address: data.address,
            status: data.status || 'Disponível',
            contract: data.contract,
            type: data.type,
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
            price: (data.contract === 'venda' || data.contract === 'ambos') ? Number(data.salePrice || data.price || 0) : 0,
            salePrice: (data.contract === 'venda' || data.contract === 'ambos') ? Number(data.salePrice || 0) : 0,
            sale_price: (data.contract === 'venda' || data.contract === 'ambos') ? Number(data.salePrice || 0) : 0,
            rentalPrice: (data.contract === 'locacao' || data.contract === 'ambos') ? Number(data.rentalPrice || 0) : 0,
            rental_price: (data.contract === 'locacao' || data.contract === 'ambos') ? Number(data.rentalPrice || 0) : 0,
            videoLink: data.videoLink || '',
            video_link: data.videoLink || '',
            video_url: data.videoLink || '',
            video: data.videoLink || ''
        };

        if (cols && cols.length > 0) {
            const colSet = new Set(cols);
            const finalPayload = {};
            Object.keys(mapping).forEach(key => {
                if (colSet.has(key)) finalPayload[key] = mapping[key];
            });
            return finalPayload;
        }
        return mapping;
    };

    const insertAdaptive = async (basePayload) => {
        if (!supabase) return { data: null, error: { message: 'Supabase indisponível' } };
        let payload = { ...basePayload };
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

        for (let attempt = 0; attempt < 5; attempt++) {
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
        return { data: null, error: { message: 'Falha após tentativas.' } };
    };

    const updateAdaptive = async (id, basePayload) => {
        if (!supabase) return { error: { message: 'Supabase indisponível' } };
        let payload = { ...basePayload };
        Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

        for (let attempt = 0; attempt < 5; attempt++) {
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
        return { error: { message: 'Falha após tentativas.' } };
    };

    useEffect(() => {
        const init = async () => {
            await discoverSchema();
            await loadProperties();
        };
        init();

        if (supabase) {
            const subscription = supabase
                .channel('properties_realtime_v21')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
                    loadProperties();
                })
                .subscribe();
            return () => { supabase.removeChannel(subscription); };
        }
    }, []);

    // ✅ CORREÇÃO CRÍTICA: Não salva Base64 no localStorage para evitar travar celular/navegador
    useEffect(() => {
        if (!loading) {
            try {
                // Filtra strings base64 muito grandes antes de salvar
                const lightProps = properties.map(p => {
                    const cleanImages = (p.images || []).map(img =>
                        (img && img.length > 500 && img.startsWith('data:image')) ? '[CACHE_REMOVED]' : img
                    ).filter(img => img !== '[CACHE_REMOVED]'); // Remove base64 do cache

                    return {
                        ...p,
                        images: cleanImages.length > 0 ? cleanImages : undefined,
                        // Mantém a imagem de capa se for URL normal
                        image: (p.image && !p.image.startsWith('data:image')) ? p.image : (cleanImages[0] || '')
                    };
                });

                localStorage.setItem('ab-properties', JSON.stringify(lightProps));
            } catch (e) {
                console.warn("Cache local muito grande, ignorando salvação no localStorage.", e);
                // Se falhar mesmo assim, limpa o cache para não quebrar o app
                localStorage.removeItem('ab-properties');
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
                    images: Array.isArray(data[0].images) ? data[0].images : (Array.isArray(data[0].gallery) ? data[0].gallery : [])
                };
                setProperties(prev => prev.map(p => p.id === localProp.id ? synced : p));
                return true;
            }
            if (error) {
                console.error("Sync error:", error);
            }
        } catch (e) {
            console.error('Erro de Rede:', e);
        }
        return false;
    }, [dbSchema, discoverSchema, properties]);

    const syncAllLocal = useCallback(async () => {
        const localProps = properties.filter(p => String(p.id).startsWith('local-') || p._isLocal);
        if (localProps.length === 0) return { success: true, count: 0 };

        let successCount = 0;
        for (const prop of localProps) {
            const ok = await syncItem(prop);
            if (ok) successCount++;
        }

        return { success: successCount === localProps.length, count: successCount };
    }, [properties, syncItem]);

    const addProperty = async (property) => {
        const tempId = `local-${Date.now()}`;
        const newProp = { ...property, id: tempId, _isLocal: true, created_at: new Date().toISOString() };
        setProperties(prev => [newProp, ...prev]);
        return await syncItem(newProp);
    };

    const updateProperty = async (id, updated) => {
        // Otimista: atualiza UI imediatamente
        const prevItem = properties.find(p => p.id === id);
        setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));

        if (String(id).startsWith('local-')) {
            return await syncItem({ ...prevItem, ...updated });
        }

        if (supabase && !String(id).startsWith('local-')) {
            try {
                let cols = dbSchema || await discoverSchema();
                const payload = buildUniversalPayload(updated, cols);
                const { error } = await updateAdaptive(id, payload);
                if (error) {
                    console.error("Update error:", error);
                    // Reverte em caso de erro
                    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...prevItem } : p));
                    return false;
                }
                return true;
            } catch (e) {
                console.error("Update exception:", e);
                return false;
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
        <PropertyContext.Provider value={{ properties, loading, isSyncing, dbSchema, addProperty, updateProperty, deleteProperty, refreshProperties: loadProperties, syncItem, syncAllLocal }}>
            {children}
        </PropertyContext.Provider>
    );
};
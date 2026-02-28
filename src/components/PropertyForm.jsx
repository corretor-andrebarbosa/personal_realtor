import React, { useState, useRef, useEffect } from 'react';
import { useProperties } from '../contexts/PropertyContext';
import { ArrowLeft, MapPin, Youtube, Upload, Save, Image, Trash2, RefreshCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const STORAGE_BUCKET = 'property-images'; // você vai criar esse bucket no Supabase (passo a passo abaixo)

const PropertyForm = () => {
    const { addProperty, updateProperty, properties } = useProperties();
    const navigate = useNavigate();
    const { id } = useParams();
    const fileInputRef = useRef(null);

    const isEditing = !!id;

    const [formData, setFormData] = useState({
        title: '',
        type: 'Apartamento',
        salePrice: '',
        rentalPrice: '',
        contract: 'venda',
        area: '',
        rooms: 0,
        bathrooms: 0,
        garage: 0,
        address: '',
        description: '',
        videoLink: '',
        images: [],
        image: ''
    });

    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [imageUrlInput, setImageUrlInput] = useState('');

    const handleAddImageUrl = () => {
        if (!imageUrlInput) return;

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, imageUrlInput],
            image: prev.image || imageUrlInput
        }));
        setImageUrlInput('');
    };

    // Load existing property data when editing
    useEffect(() => {
        if (isEditing) {
            const existing = properties.find(p => p.id == id);
            if (existing) {
                setFormData({
                    title: existing.title || '',
                    type: existing.type || 'Apartamento',
                    salePrice: existing.price || existing.salePrice || '',
                    rentalPrice: existing.rentalPrice || '',
                    contract: existing.contract || 'venda',
                    area: existing.area || '',
                    rooms: existing.rooms || 0,
                    bathrooms: existing.bathrooms || 0,
                    garage: existing.garage || 0,
                    address: existing.address || '',
                    description: existing.description || '',
                    videoLink: existing.videoLink || existing.video || '',
                    images: existing.images || [],
                    image: existing.image || ''
                });
            }
        }
    }, [id, isEditing, properties]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleContractChange = (type) => {
        setFormData(prev => ({ ...prev, contract: type }));
    };

    // ---------- Helpers (upload + compress) ----------
    const sanitizeFileName = (name = 'image') => {
        return name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);
    };

    const randomId = () => {
        try {
            return crypto.randomUUID();
        } catch {
            return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
    };

    const isDataUrl = (s) => typeof s === 'string' && s.startsWith('data:image/');
    const isHttpUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

    // Compressão leve no navegador (sem libs, grátis)
    // Saída: Blob (webp se possível, senão jpeg)
    const compressFileToBlob = async (file, maxWidth = 1600, quality = 0.78) => {
        // Se já for muito pequeno, manda direto
        if (file.size <= 250 * 1024) return file;

        const url = URL.createObjectURL(file);

        try {
            const img = document.createElement('img');
            img.decoding = 'async';

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // tenta webp
            const blob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/webp', quality);
            });

            if (blob) return blob;

            // fallback jpeg
            const jpg = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
            });

            return jpg || file;
        } catch {
            return file;
        } finally {
            URL.revokeObjectURL(url);
        }
    };

    const extractStoragePathFromPublicUrl = (publicUrl) => {
        // padrão: .../storage/v1/object/public/<bucket>/<path>
        if (!publicUrl || typeof publicUrl !== 'string') return null;
        const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
        const idx = publicUrl.indexOf(marker);
        if (idx === -1) return null;
        return publicUrl.slice(idx + marker.length);
    };

    const uploadOneToStorage = async (file) => {
        if (!supabase) throw new Error('Supabase indisponível.');

        const extFromName = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const safeName = sanitizeFileName(file.name || `foto.${extFromName}`);
        const folder = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const path = `${folder}/${randomId()}-${safeName}`;

        const blob = await compressFileToBlob(file, 1600, 0.78);

        const { error: uploadError } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .upload(path, blob, {
                cacheControl: '31536000',
                upsert: false,
                contentType: blob.type || file.type || 'image/jpeg'
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        const url = data?.publicUrl || null;
        if (!url) throw new Error('Falha ao gerar URL pública.');
        return url;
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        setSaveError('');

        // Limite 15
        const limitedFiles = files.slice(0, 15);

        try {
            // upload sequencial = mais estável (menos chance de falhar)
            const uploadedUrls = [];
            for (const file of limitedFiles) {
                const url = await uploadOneToStorage(file);
                uploadedUrls.push(url);
            }

            setFormData(prev => {
                const current = Array.isArray(prev.images) ? prev.images : [];
                const merged = [...current, ...uploadedUrls].slice(0, 15);
                return {
                    ...prev,
                    images: merged,
                    image: prev.image || uploadedUrls[0] || ''
                };
            });
        } catch (err) {
            console.error('Erro upload:', err);
            setSaveError(
                `Falha ao subir imagens. Verifique se o bucket "${STORAGE_BUCKET}" existe no Supabase Storage e está como Público, com política permitindo upload. Mensagem: ${err?.message || 'erro desconhecido'}`
            );
        } finally {
            setUploading(false);
            // permite selecionar o MESMO arquivo de novo depois
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = async (index) => {
        // remove da tela
        const imgToRemove = formData.images?.[index];

        setFormData(prev => {
            const newImages = prev.images.filter((_, i) => i !== index);
            return {
                ...prev,
                images: newImages,
                image: newImages.length > 0 ? newImages[0] : ''
            };
        });

        // tenta remover do storage (se for url do supabase storage)
        try {
            if (supabase && isHttpUrl(imgToRemove)) {
                const path = extractStoragePathFromPublicUrl(imgToRemove);
                if (path) {
                    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
                }
            }
        } catch (e) {
            // best-effort: não quebra o fluxo
            console.warn('Não consegui remover do storage (ok):', e?.message || e);
        }
    };

    const setCoverImage = (index) => {
        setFormData(prev => ({
            ...prev,
            image: prev.images[index]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveError('');

        try {
            // PROTEÇÃO: se ainda tiver base64 no formData, bloqueia (evita quebrar tudo)
            if ((formData.images || []).some(isDataUrl) || isDataUrl(formData.image)) {
                setSaveError('Ainda existem imagens em base64 (data:image/...). Remova e reenvie as fotos para o Storage.');
                setSaving(false);
                return;
            }

            const salePrice = Number(formData.salePrice || 0);
            const rentalPrice = Number(formData.rentalPrice || 0);
            let finalContract = formData.contract;

            if (salePrice > 0 && rentalPrice > 0) finalContract = 'ambos';

            const propertyData = {
                title: formData.title,
                type: formData.type,

                price: (finalContract === 'venda' || finalContract === 'ambos') ? Number(formData.salePrice || 0) : 0,
                salePrice: (finalContract === 'venda' || finalContract === 'ambos') ? Number(formData.salePrice || 0) : 0,
                sale_price: (finalContract === 'venda' || finalContract === 'ambos') ? Number(formData.salePrice || 0) : 0,

                rentalPrice: (finalContract === 'locacao' || finalContract === 'ambos') ? Number(formData.rentalPrice || 0) : 0,
                rental_price: (finalContract === 'locacao' || finalContract === 'ambos') ? Number(formData.rentalPrice || 0) : 0,

                contract: finalContract,
                area: Number(formData.area || 0),
                rooms: formData.rooms,
                bathrooms: formData.bathrooms,
                garage: formData.garage,
                address: formData.address,
                description: formData.description,
                videoLink: formData.videoLink,

                // AGORA: somente URLs
                images: Array.isArray(formData.images) ? formData.images.slice(0, 15).filter(Boolean) : [],
                image: formData.image || (formData.images.length > 0 ? formData.images[0] : ''),

                status: 'Disponível'
            };

            let success = false;
            if (isEditing) {
                success = await updateProperty(id, propertyData);
            } else {
                success = await addProperty(propertyData);
            }

            if (success) {
                setSaved(true);
                setTimeout(() => navigate('/properties'), 1500);
            } else {
                setSaveError('Erro ao salvar no banco. Verifique se a tabela aceita o campo images (array/text) e se o schema cache está ok.');
            }
        } catch (error) {
            console.error('Erro ao salvar imóvel:', error);
            setSaveError(`Erro crítico no salvamento: ${error?.message || 'desconhecido'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-24">
            <header className="fixed top-0 left-0 w-full bg-white z-10 shadow-sm px-4 py-3 flex items-center gap-4">
                <Link to="/properties" className="text-slate-500 hover:text-slate-800"><ArrowLeft size={24} /></Link>
                <h1 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Imóvel' : 'Novo Imóvel'}</h1>
            </header>

            {saved && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-bounce-in">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-lg font-bold text-slate-800">Imóvel Salvo com Sucesso!</h3>
                        <p className="text-sm text-slate-500">Redirecionando...</p>
                    </div>
                </div>
            )}

            {saveError && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setSaveError('')}>
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-bounce-in max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-lg font-bold text-amber-600">Atenção</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{saveError}</p>
                        <button onClick={() => setSaveError('')} className="mt-6 w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20">Entendido</button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="pt-20 px-4 max-w-lg mx-auto space-y-6">

                {/* Basic Info */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        Informações Básicas
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Título do Imóvel</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors"
                                placeholder="Ex: Apartamento Garden com Vista Mar"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Tipo do Imóvel</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors"
                            >
                                <option value="Apartamento">Apartamento</option>
                                <option value="Casa">Casa</option>
                                <option value="Studio">Studio</option>
                                <option value="Cobertura">Cobertura</option>
                                <option value="Sala Comercial">Sala Comercial</option>
                                <option value="Terreno">Terreno</option>
                                <option value="Loja">Loja</option>
                                <option value="Galpão">Galpão</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => handleContractChange('venda')}
                                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all text-sm ${formData.contract === 'venda'
                                    ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                                    : 'bg-white text-slate-400 border-slate-200'
                                    }`}
                            >
                                Venda
                            </button>
                            <button
                                type="button"
                                onClick={() => handleContractChange('locacao')}
                                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all text-sm ${formData.contract === 'locacao'
                                    ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                                    : 'bg-white text-slate-400 border-slate-200'
                                    }`}
                            >
                                Locação
                            </button>
                            <button
                                type="button"
                                onClick={() => handleContractChange('ambos')}
                                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all text-sm ${formData.contract === 'ambos'
                                    ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                                    : 'bg-white text-slate-400 border-slate-200'
                                    }`}
                            >
                                Ambos
                            </button>
                        </div>

                        {(formData.contract === 'venda' || formData.contract === 'ambos') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Preço de Venda (R$)</label>
                                <input
                                    type="number"
                                    name="salePrice"
                                    value={formData.salePrice}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors font-mono"
                                    placeholder="0"
                                />
                            </div>
                        )}

                        {(formData.contract === 'locacao' || formData.contract === 'ambos') && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Valor do Aluguel (R$)</label>
                                <input
                                    type="number"
                                    name="rentalPrice"
                                    value={formData.rentalPrice}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors font-mono"
                                    placeholder="0"
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Dimensions */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        Dimensões e Cômodos
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Área (m²)</label>
                            <input type="number" name="area" value={formData.area} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Quartos</label>
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button type="button" onClick={() => setFormData(p => ({ ...p, rooms: Math.max(0, p.rooms - 1) }))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600">-</button>
                                <input type="number" value={formData.rooms} readOnly className="w-full text-center bg-transparent outline-none font-bold" />
                                <button type="button" onClick={() => setFormData(p => ({ ...p, rooms: p.rooms + 1 }))} className="w-8 h-8 flex items-center justify-center bg-[var(--primary-color)] text-white rounded-lg shadow-sm font-bold">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Banheiros</label>
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button type="button" onClick={() => setFormData(p => ({ ...p, bathrooms: Math.max(0, p.bathrooms - 1) }))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600">-</button>
                                <input type="number" value={formData.bathrooms} readOnly className="w-full text-center bg-transparent outline-none font-bold" />
                                <button type="button" onClick={() => setFormData(p => ({ ...p, bathrooms: p.bathrooms + 1 }))} className="w-8 h-8 flex items-center justify-center bg-[var(--primary-color)] text-white rounded-lg shadow-sm font-bold">+</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Vagas</label>
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button type="button" onClick={() => setFormData(p => ({ ...p, garage: Math.max(0, p.garage - 1) }))} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600">-</button>
                                <input type="number" value={formData.garage} readOnly className="w-full text-center bg-transparent outline-none font-bold" />
                                <button type="button" onClick={() => setFormData(p => ({ ...p, garage: p.garage + 1 }))} className="w-8 h-8 flex items-center justify-center bg-[var(--primary-color)] text-white rounded-lg shadow-sm font-bold">+</button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Location */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        Localização
                    </h2>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary-color)]" size={18} />
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors"
                            placeholder="Endereço Completo (Rua, Número, Bairro...)"
                        />
                    </div>
                </section>

                {/* Description */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        Descrição
                    </h2>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="4"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors resize-none leading-relaxed"
                        placeholder="Descreva o imóvel em detalhes: acabamento, diferenciais, condomínio..."
                    />
                </section>

                {/* Media - Photos & Video */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        <Image size={16} /> Fotos e Vídeo
                    </h2>

                    {/* URL Image Input */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                            placeholder="Cole a URL aqui..."
                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleAddImageUrl}
                            className="w-12 flex items-center justify-center bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-[var(--primary-color)] hover:text-white transition-colors border border-slate-200"
                            title="Adicionar URL"
                        >
                            +
                        </button>
                    </div>

                    {/* Upload button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-20 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-[var(--primary-color)] hover:bg-blue-100 transition-colors mb-4"
                    >
                        <Upload size={24} className="mb-1" />
                        <span className="text-xs font-bold">
                            {uploading ? 'Enviando para o Storage...' : 'Clique para Adicionar Fotos'}
                        </span>
                    </button>

                    {/* Image preview grid */}
                    {formData.images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {formData.images.map((img, index) => (
                                <div key={index} className="relative group rounded-lg overflow-hidden aspect-square">
                                    <img src={img} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCoverImage(index)}
                                            className={`p-1.5 rounded-full transition-colors ${formData.image === img ? 'bg-emerald-500 text-white' : 'bg-white text-slate-700 hover:bg-emerald-100'}`}
                                            title="Definir como capa"
                                        >
                                            <Image size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                                            title="Remover"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {formData.image === img && (
                                        <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">Capa</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Link de Vídeo (YouTube)</label>
                        <div className="relative">
                            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                            <input
                                type="url"
                                name="videoLink"
                                value={formData.videoLink}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none transition-colors"
                                placeholder="https://youtube.com/watch?v=..."
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                            Este vídeo será exibido com destaque na página de detalhes.
                        </p>
                    </div>
                </section>

                <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                    <div className="flex gap-4 max-w-lg mx-auto">
                        <button type="button" onClick={() => navigate('/properties')} className="flex-1 py-3 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving || uploading} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 ${(saving || uploading) ? 'bg-slate-400 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:bg-[var(--primary-dark)]'}`}>
                            {saving ? (
                                <><RefreshCcw size={18} className="animate-spin" /> Salvando...</>
                            ) : uploading ? (
                                <><RefreshCcw size={18} className="animate-spin" /> Enviando...</>
                            ) : (
                                <><Save size={18} /> {isEditing ? 'Salvar Alterações' : 'Cadastrar Imóvel'}</>
                            )}
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
};

export default PropertyForm;
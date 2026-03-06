
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useProperties } from '../contexts/PropertyContext';
import { ArrowLeft, MapPin, Youtube, Upload, Save, Image, Trash2, RefreshCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const STORAGE_BUCKET = 'property-images'; // você vai criar esse bucket no Supabase (passo a passo abaixo)

const isBase64Image = (s) => typeof s === 'string' && s.startsWith('data:image/');


const normalizeToArray = (raw, fallback = []) => {
  if (!raw) return fallback;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return fallback;
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      if (t.startsWith('{') && t.endsWith('}')) {
        return t
          .slice(1, -1)
          .split(',')
          .map(x => x.trim().replace(/^"|"$/g, ''))
          .filter(Boolean);
      }
      return [t];
    }
  }
  if (typeof raw === 'object') {
    return Object.values(raw).filter(Boolean);
  }
  return fallback;
};

const normalizeExistingPropertyToForm = (existing) => {
  const images = normalizeToArray(existing?.images, normalizeToArray(existing?.gallery, []));
  const cover =
    existing?.image ||
    existing?.image_url ||
    existing?.main_image ||
    existing?.capa ||
    existing?.foto_principal ||
    images?.[0] ||
    '';

  return {
    title: existing?.title || '',
    type: existing?.type || 'Apartamento',
    salePrice: existing?.price || existing?.salePrice || existing?.sale_price || '',
    rentalPrice: existing?.rentalPrice || existing?.rental_price || '',
    contract: existing?.contract || 'venda',
    area: existing?.area || existing?.total_area || existing?.m2 || existing?.square_meters || '',
    rooms: Number(existing?.rooms || 0),
    bathrooms: Number(existing?.bathrooms || 0),
    garage: Number(existing?.garage || 0),
    address: existing?.address || '',
    description: existing?.description || '',
    videoLink: existing?.videoLink || existing?.video || existing?.video_url || existing?.video_link || '',
    priceType: existing?.price_type || existing?.priceType || 'fixo',
    caucao: existing?.caucao ?? false,
    fiador: existing?.fiador ?? false,
    images: images || [],
    image: cover
  };
};

const PropertyForm = () => {
  const { addProperty, updateProperty, properties } = useProperties();
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  
  // ✅ CORREÇÃO: Ref para controlar se o formulário já carregou os dados iniciais
  // Impede que o useEffect sobrescreva o que o usuário está digitando.
  const isInitialized = useRef(false);

  const isEditing = !!id;

  const [formData, setFormData] = useState({
    title: '',
    type: 'Apartamento',
    salePrice: '',
    rentalPrice: '',
    contract: 'venda',
    priceType: 'fixo',
    caucao: false,
    fiador: false,
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

  const [original, setOriginal] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showBase64Warning, setShowBase64Warning] = useState(false);

  const hasBase64 = useMemo(() => {
    return (formData.images || []).some(isBase64Image) || isBase64Image(formData.image);
  }, [formData.images, formData.image]);

  const handleAddImageUrl = () => {
    const url = (imageUrlInput || '').trim();
    if (!url) return;

    setFormData(prev => {
      const nextImages = [...(prev.images || []), url];
      return {
        ...prev,
        images: nextImages,
        image: prev.image || url
      };
    });
    setImageUrlInput('');
  };

  // Load existing property data when editing
  useEffect(() => {
    if (!isEditing) return;

    // ✅ LÓGICA CORRIGIDA:
    // Só carrega os dados se:
    // 1. Ainda não foi inicializado para este ID.
    // OU
    // 2. O ID mudou (navegação entre imóveis).
    if (isInitialized.current === id) return; 

    const existing = properties.find(p => String(p.id) === String(id));
    
    if (existing) {
      const normalized = normalizeExistingPropertyToForm(existing);
      setFormData(normalized);
      setOriginal(normalized);
      isInitialized.current = id; // Marca como carregado para este ID
    }
  }, [id, isEditing, properties]);

  useEffect(() => {
    if (isEditing && hasBase64) setShowBase64Warning(true);
  }, [isEditing, hasBase64]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContractChange = (type) => {
    setFormData(prev => ({ ...prev, contract: type }));
  };

  const compressImage = (dataUrl, maxWidth = 800, quality = 0.5) => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const limitedFiles = files.slice(0, 15);

    const readers = limitedFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const compressed = await compressImage(ev.target.result);
          resolve(compressed);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(results => {
      setFormData(prev => {
        const nextImages = [...(prev.images || [])];
        const combined = [...nextImages, ...results].slice(0, 15);

        return {
          ...prev,
          images: combined,
          image: prev.image || combined[0] || ''
        };
      });
      setUploading(false);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const newImages = (prev.images || []).filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image: newImages.length > 0 ? newImages[0] : ''
      };
    });
  };

  const setCoverImage = (index) => {
    setFormData(prev => ({
      ...prev,
      image: (prev.images || [])[index] || prev.image
    }));
  };

  const buildPropertyData = () => {
    const salePrice = Number(formData.salePrice || 0);
    const rentalPrice = Number(formData.rentalPrice || 0);

    let finalContract = formData.contract;
    if (salePrice > 0 && rentalPrice > 0) finalContract = 'ambos';

    return {
      title: formData.title,
      type: formData.type,

      price: (finalContract === 'venda' || finalContract === 'ambos') ? salePrice : 0,
      salePrice: (finalContract === 'venda' || finalContract === 'ambos') ? salePrice : 0,
      sale_price: (finalContract === 'venda' || finalContract === 'ambos') ? salePrice : 0,

      rentalPrice: (finalContract === 'locacao' || finalContract === 'ambos') ? rentalPrice : 0,
      rental_price: (finalContract === 'locacao' || finalContract === 'ambos') ? rentalPrice : 0,

      contract: finalContract,

      area: Number(formData.area || 0),
      rooms: Number(formData.rooms || 0),
      bathrooms: Number(formData.bathrooms || 0),
      garage: Number(formData.garage || 0),

      address: formData.address,
      description: formData.description,

      // Envia todas variações de nome de campo para garantir gravação
      videoLink: formData.videoLink,
      video_url: formData.videoLink,
      video: formData.videoLink,
      video_link: formData.videoLink,

      images: (formData.images || []).filter(Boolean),
      image: formData.image || (formData.images?.[0] || ''),

      price_type: formData.priceType || 'fixo',
      priceType: formData.priceType || 'fixo',

      caucao: formData.caucao || false,
      fiador: formData.fiador || false,

      status: 'Disponível'
    };
  };

  const didImagesChange = () => {
    if (!original) return true;
    const a = (original.images || []).filter(Boolean);
    const b = (formData.images || []).filter(Boolean);
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return true;
    }
    if ((original.image || '') !== (formData.image || '')) return true;
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      const propertyData = buildPropertyData();
      const imagesChanged = didImagesChange();

      if (isEditing && !imagesChanged) {
        // Não envia imagens se não mudaram — evita erros de tipo e reduz payload
        delete propertyData.images;
        delete propertyData.image;
      }

      let success = false;

      if (isEditing) {
        success = await updateProperty(id, propertyData);
      } else {
        success = await addProperty(propertyData);
      }

      if (success === true) {
        setSaved(true);
        setTimeout(() => navigate('/properties'), 1200);
      } else {
        const errMsg = typeof success === 'string' ? success : 'Erro desconhecido ao salvar.';
        setSaveError(`Erro ao salvar: ${errMsg}`);
      }
    } catch (error) {
      console.error('Erro ao salvar imóvel:', error);
      setSaveError('Erro crítico no salvamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <header className="fixed top-0 left-0 w-full bg-white z-10 shadow-sm px-4 py-3 flex items-center gap-4">
        <Link to="/properties" className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={24} />
        </Link>
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

      {!!saveError && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setSaveError('')}>
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-bounce-in max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-amber-600">Não foi possível salvar</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{saveError}</p>
            <button
              onClick={() => setSaveError('')}
              className="mt-6 w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pt-20 px-4 max-w-lg mx-auto space-y-6">
        
        {showBase64Warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="text-sm font-bold text-amber-800">Atenção</div>
            <div className="text-xs text-amber-700 mt-1">
              Este imóvel ainda possui fotos em base64 (<span className="font-mono">data:image/...</span>).
              Você já pode salvar alterações (ex.: vídeo/descrição) — mas recomendamos migrar as fotos para o Storage no próximo passo.
            </div>
            <button
              type="button"
              className="mt-3 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => setShowBase64Warning(false)}
            >
              Entendido
            </button>
          </div>
        )}

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[var(--primary-color)]">
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
                className={`py-3 rounded-xl font-bold border transition-all text-sm ${formData.contract === 'venda'
                  ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                  : 'bg-white text-slate-400 border-slate-200'
                  }`}
              >
                Venda
              </button>
              <button
                type="button"
                onClick={() => handleContractChange('locacao')}
                className={`py-3 rounded-xl font-bold border transition-all text-sm ${formData.contract === 'locacao'
                  ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                  : 'bg-white text-slate-400 border-slate-200'
                  }`}
              >
                Locação
              </button>
              <button
                type="button"
                onClick={() => handleContractChange('ambos')}
                className={`py-3 rounded-xl font-bold border transition-all text-sm ${formData.contract === 'ambos'
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

            {(formData.contract === 'venda' || formData.contract === 'ambos') && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo do Preço de Venda</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'fixo', label: 'Fixo' },
                    { value: 'negociavel', label: 'Negociável' },
                    { value: 'a_partir_de', label: 'A partir de' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priceType: opt.value }))}
                      className={`py-2 rounded-xl font-bold border transition-all text-sm ${formData.priceType === opt.value
                        ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)] shadow-md'
                        : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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

            {(formData.contract === 'locacao' || formData.contract === 'ambos') && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Requisitos de Locação</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-1 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.caucao}
                      onChange={e => setFormData(p => ({ ...p, caucao: e.target.checked }))}
                      className="w-4 h-4 accent-[var(--primary-color)]"
                    />
                    <span className="text-sm font-bold text-slate-700">Caução</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-1 hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.fiador}
                      onChange={e => setFormData(p => ({ ...p, fiador: e.target.checked }))}
                      className="w-4 h-4 accent-[var(--primary-color)]"
                    />
                    <span className="text-sm font-bold text-slate-700">Fiador</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[var(--primary-color)]">
            Dimensões e Cômodos
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Área (m²)</label>
              <input
                type="number"
                name="area"
                value={formData.area}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                placeholder="0"
              />
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

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[var(--primary-color)]">
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

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[var(--primary-color)]">
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

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
            <Image size={16} /> Fotos e Vídeo
          </h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
              placeholder="Cole a URL de alta resolução aqui..."
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
            <span className="text-xs font-bold">{uploading ? 'Processando...' : 'Clique para Adicionar Fotos'}</span>
          </button>

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
                  {isBase64Image(img) && (
                    <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">
                      BASE64
                    </span>
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
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:bg-[var(--primary-dark)]'}`}
            >
              {saving ? (
                <>
                  <RefreshCcw size={18} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save size={18} /> {isEditing ? 'Salvar Alterações' : 'Cadastrar Imóvel'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PropertyForm;
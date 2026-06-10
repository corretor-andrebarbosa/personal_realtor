
import React, { useState } from 'react';
import { Search, Home, DollarSign, MapPin, BedDouble, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const URBAN_TYPES = ['Apartamento', 'Casa', 'Cobertura', 'Flat', 'Kitnet'];
const RURAL_TYPES  = ['Chácara', 'Sítio', 'Fazenda', 'Terreno'];

const PropertyFilters = ({ onFilterChange, neighborhoods = [], t = (k) => k, defaultSegment = '' }) => {
    const [filters, setFilters] = useState({
        neighborhood: '',
        type: '',
        bedrooms: '',
        minPrice: '',
        maxPrice: '',
        contract: '',
        segment: defaultSegment,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleSegment = (value) => {
        const newFilters = { ...filters, segment: value, type: '', bedrooms: '' };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const typeOptions = filters.segment === 'litoral' ? URBAN_TYPES
        : filters.segment === 'campo'   ? RURAL_TYPES
        : [...URBAN_TYPES, ...RURAL_TYPES];

    const isRuralSegment = filters.segment === 'campo';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg -mt-10 relative z-30 mx-6 md:mx-auto max-w-6xl border border-slate-100">

            {/* Link de volta ao portal — só aparece quando vindo de /litoral ou /campo */}
            {defaultSegment && (
                <div className="mb-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <ArrowLeft size={12} /> Início — trocar segmento
                    </Link>
                </div>
            )}

            {/* Seletor de segmento */}
            <div className="flex gap-2 mb-5 flex-wrap">
                <button
                    onClick={() => handleSegment('')}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${filters.segment === '' ? 'bg-[var(--primary-color)] text-white border-transparent shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                    Todos
                </button>
                <button
                    onClick={() => handleSegment('litoral')}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${filters.segment === 'litoral' ? 'bg-blue-600 text-white border-transparent shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                    🌊 Litoral & Cidade
                </button>
                <button
                    onClick={() => handleSegment('campo')}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${filters.segment === 'campo' ? 'bg-emerald-600 text-white border-transparent shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >
                    🌳 Campo & Interior
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">

                {/* Finalidade */}
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{t('filter_contract') || 'Finalidade'}</label>
                    <select
                        name="contract"
                        value={filters.contract}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                    >
                        <option value="">{t('filter_all') || 'Todos'}</option>
                        <option value="venda">{t('filter_sale') || 'Comprar'}</option>
                        <option value="locacao">{t('filter_rent') || 'Alugar'}</option>
                    </select>
                </div>

                {/* Localização */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={12} /> {t('filter_neighborhood') || 'Localização'}
                    </label>
                    <input
                        type="text"
                        name="neighborhood"
                        value={filters.neighborhood}
                        onChange={handleChange}
                        placeholder={isRuralSegment ? 'Mari, Brejo, Sapé, Alagoa Grande...' : 'João Pessoa, Manaíra, Tambaú...'}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                    />
                </div>

                {/* Tipo */}
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <Home size={12} /> {t('filter_type') || 'Tipo'}
                    </label>
                    <select
                        name="type"
                        value={filters.type}
                        onChange={handleChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                    >
                        <option value="">{t('filter_any') || 'Qualquer'}</option>
                        {typeOptions.map(tp => (
                            <option key={tp} value={tp}>{tp}</option>
                        ))}
                    </select>
                </div>

                {/* Quartos — só para segmento urbano */}
                {!isRuralSegment ? (
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                            <BedDouble size={12} /> {t('filter_beds') || 'Quartos'}
                        </label>
                        <select
                            name="bedrooms"
                            value={filters.bedrooms}
                            onChange={handleChange}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                        >
                            <option value="">{t('filter_any') || 'Qualquer'}</option>
                            <option value="1">1+</option>
                            <option value="2">2+</option>
                            <option value="3">3+</option>
                            <option value="4">4+</option>
                        </select>
                    </div>
                ) : (
                    /* Área (ha) — só para campo */
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                            Área (m²)
                        </label>
                        <input
                            type="number"
                            name="minArea"
                            value={filters.minArea || ''}
                            onChange={handleChange}
                            placeholder="Mín. m²"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                        />
                    </div>
                )}

                {/* Preço */}
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign size={12} /> {t('filter_max_price') || 'Preço até'}
                    </label>
                    <input
                        type="number"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleChange}
                        placeholder="R$ 0,00"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                    />
                </div>

                {/* Buscar */}
                <div className="col-span-1">
                    <button
                        className="w-full h-[46px] bg-[var(--primary-color)] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        onClick={() => {
                            onFilterChange(filters);
                            const section = document.getElementById('imoveis');
                            if (section) section.scrollIntoView({ behavior: 'smooth' });
                        }}
                    >
                        <Search size={18} /> {t('filter_search') || 'Buscar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyFilters;

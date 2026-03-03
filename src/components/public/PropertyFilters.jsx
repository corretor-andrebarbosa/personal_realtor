
import React, { useState } from 'react';
import { Search, Filter, Home, DollarSign, MapPin, BedDouble } from 'lucide-react';

const PropertyFilters = ({ onFilterChange, neighborhoods = [], t = (k) => k }) => {
    const [filters, setFilters] = useState({
        neighborhood: '',
        type: '',
        bedrooms: '',
        minPrice: '',
        maxPrice: '',
        contract: '' // venda ou aluguel
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg -mt-10 relative z-30 mx-6 md:mx-auto max-w-6xl border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">

                {/* Contract Type */}
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

                {/* Location */}
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={12} /> {t('filter_neighborhood') || 'Localização'}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            name="neighborhood"
                            value={filters.neighborhood}
                            onChange={handleChange}
                            placeholder="João Pessoa..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--primary-color)] outline-none"
                        />
                    </div>
                </div>

                {/* Type */}
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
                        <option value="Apartamento">{t('type_apartment') || 'Apartamento'}</option>
                        <option value="Casa">{t('type_house') || 'Casa'}</option>
                        <option value="Cobertura">{t('type_penthouse') || 'Cobertura'}</option>
                        <option value="Flat">{t('type_flat') || 'Flat'}</option>
                    </select>
                </div>

                {/* Bedrooms */}
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

                {/* Price */}
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

                {/* Search Button */}
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


import React, { useState } from 'react';
import { useProperties } from '../contexts/PropertyContext';
import PropertyCard from './PropertyCard';
import { Filter, Search, PlusCircle, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const PropertyList = () => {
    const { properties, loading, refreshProperties } = useProperties();
    const [filterContract, setFilterContract] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [syncing, setSyncing] = useState(false);

    const handleRefresh = async () => {
        setSyncing(true);
        await refreshProperties();
        setTimeout(() => setSyncing(false), 1000);
    };

    const filteredProperties = properties.filter(p => {
        const matchesContract = filterContract === 'all' ||
            (filterContract === 'venda' && (p.contract === 'venda' || p.contract === 'ambos' || Number(p.price || p.salePrice || 0) > 0)) ||
            (filterContract === 'locacao' && (p.contract === 'locacao' || p.contract === 'ambos' || Number(p.rentalPrice || 0) > 0));
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.address || '').toLowerCase().includes(search.toLowerCase());
        return matchesContract && matchesStatus && matchesSearch;
    });

    return (
        <div className="pb-24 min-h-screen bg-slate-50">
            <header className="fixed top-0 left-0 w-full bg-white z-10 shadow-sm px-4 py-3 flex justify-between items-center border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-slate-800">Meus Imóveis</h1>
                    <button
                        onClick={handleRefresh}
                        className={`p-1.5 rounded-full transition-all ${syncing ? 'bg-blue-100 text-blue-600 animate-spin' : 'text-slate-400 hover:bg-slate-100'}`}
                        title="Sincronizar com a nuvem"
                    >
                        <RefreshCcw size={18} />
                    </button>
                    {syncing && <span className="text-[10px] font-bold text-blue-500 uppercase animate-pulse">Sincronizando...</span>}
                </div>
                <Link to="/properties/new" className="text-[var(--primary-color)] flex items-center gap-1 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100">
                    <PlusCircle size={16} /> Novo
                </Link>
            </header>

            <div className="pt-20 px-4 space-y-4 max-w-lg mx-auto">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por título ou endereço..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:border-[var(--primary-color)] outline-none transition-colors"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button
                        onClick={() => setFilterContract('all')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${filterContract === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterContract('venda')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${filterContract === 'venda' ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Venda
                    </button>
                    <button
                        onClick={() => setFilterContract('locacao')}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${filterContract === 'locacao' ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Locação
                    </button>
                </div>

                <div className="flex gap-2 text-xs font-medium text-slate-500 mb-4 items-center">
                    <Filter size={14} /> Filtros:
                    <select
                        className="bg-transparent border-none outline-none font-bold text-slate-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Todos Status</option>
                        <option value="Disponível">Disponível</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Vendido">Vendido</option>
                    </select>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {filteredProperties.length > 0 ? (
                        filteredProperties.map(property => (
                            <PropertyCard key={property.id} property={property} />
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <p>Nenhum imóvel encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyList;

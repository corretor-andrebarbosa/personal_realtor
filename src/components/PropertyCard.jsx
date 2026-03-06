
import React, { useState } from 'react';
import { MapPin, BedDouble, Bath, Car, PlayCircle, Edit, Trash2, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';

const PropertyCard = ({ property }) => {
    const isSale = property.contract === 'venda' || (!property.contract && !property.rentalPrice);
    const isBoth = property.contract === 'ambos';
    const { deleteProperty, syncItem } = useProperties();
    const [showConfirm, setShowConfirm] = useState(false);
    const [retrying, setRetrying] = useState(false);

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowConfirm(true);
    };

    const confirmDelete = () => {
        deleteProperty(property.id);
        setShowConfirm(false);
    };

    const handleRetry = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setRetrying(true);
        await syncItem(property);
        setRetrying(false);
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group relative">
                {property._isLocal && (
                    <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                        <div className="bg-amber-100 text-amber-600 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm border border-amber-200">
                            <CloudOff size={10} /> Local (Pendente)
                        </div>
                        {property.sync_error && (
                            <div className="bg-red-50 text-red-500 px-2 py-0.5 rounded border border-red-100 text-[8px] max-w-[150px] leading-tight flex items-center gap-1">
                                <AlertCircle size={8} /> {property.sync_error}
                            </div>
                        )}
                        <button
                            onClick={handleRetry}
                            disabled={retrying}
                            className={`bg-white text-blue-600 px-2 py-1 rounded-md text-[9px] font-bold flex items-center gap-1 shadow-sm border border-blue-100 active:scale-95 transition-all ${retrying ? 'opacity-50' : 'hover:bg-blue-50'}`}
                        >
                            <RefreshCw size={10} className={retrying ? 'animate-spin' : ''} />
                            {retrying ? 'Tentando...' : 'Sincronizar Agora'}
                        </button>
                    </div>
                )}
                <Link to={`/properties/${property.id}`} className="block">
                    <div className="relative aspect-[16/9] bg-slate-200">
                        {property.image ? (
                            <img src={property.image} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">Sem Imagem</div>
                        )}

                        <div className="absolute top-2 left-2 flex gap-2">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${property.status === 'Disponível' ? 'bg-emerald-500 text-white' :
                                property.status === 'Reservado' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                                }`}>
                                {property.status}
                            </span>
                            {(property.video || property.videoLink) && (
                                <span className="bg-white/90 backdrop-blur text-slate-800 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                    <PlayCircle size={12} className="text-[var(--primary-color)]" /> Vídeo
                                </span>
                            )}
                        </div>

                        {property.images && property.images.length > 1 && (
                            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md font-bold">
                                📷 {property.images.length}
                            </span>
                        )}
                    </div>
                </Link>

                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <Link to={`/properties/${property.id}`} className="block flex-1">
                            <h3 className="font-bold text-slate-800 text-lg line-clamp-1">{property.title}</h3>
                        </Link>
                        <div className="text-right ml-2 text-sm">
                            {isBoth ? (
                                <>
                                    <div className="text-[var(--primary-color)] font-bold whitespace-nowrap">
                                        R$ {(property.price || property.salePrice || 0).toLocaleString('pt-BR')}
                                    </div>
                                    <div className="text-emerald-600 font-bold whitespace-nowrap text-xs">
                                        R$ {(property.rentalPrice || 0).toLocaleString('pt-BR')}/mês
                                    </div>
                                </>
                            ) : (
                                <span className="text-[var(--primary-color)] font-bold whitespace-nowrap">
                                    {isSale
                                        ? `R$ ${(property.price || property.salePrice || 0).toLocaleString('pt-BR')}`
                                        : `R$ ${(property.rentalPrice || 0).toLocaleString('pt-BR')}/mês`
                                    }
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
                        <MapPin size={14} />
                        <span className="truncate">{property.address || 'Endereço não informado'}</span>
                    </div>

                    {(property.caucao || property.fiador) && (
                        <div className="flex gap-1 mb-3">
                            {property.caucao && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">Caução</span>}
                            {property.fiador && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold">Fiador</span>}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-slate-600 text-sm">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1" title="Quartos"><BedDouble size={16} /> {property.rooms}</span>
                            <span className="flex items-center gap-1" title="Banheiros"><Bath size={16} /> {property.bathrooms}</span>
                            <span className="flex items-center gap-1" title="Vagas"><Car size={16} /> {property.garage}</span>
                            <span className="flex items-center gap-1" title="Área">{property.area}m²</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Link
                                to={`/properties/edit/${property.id}`}
                                className="text-[var(--primary-color)] p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Editar"
                                onClick={e => e.stopPropagation()}
                            >
                                <Edit size={14} />
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="text-red-500 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-bounce-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Imóvel?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Esta ação é irreversível. O imóvel <strong>"{property.title}"</strong> será removido permanentemente.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">Sim, Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PropertyCard;

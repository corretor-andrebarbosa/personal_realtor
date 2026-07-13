
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, Handshake, Eye } from 'lucide-react';
import { usePartners } from '../contexts/PartnerContext';

const PartnerList = () => {
    const { partners, loading, deletePartner } = usePartners();
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleDelete = async (id) => {
        await deletePartner(id);
        setDeleteConfirm(null);
    };

    return (
        <div className="pb-24 bg-slate-50 min-h-screen">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Handshake size={22} className="text-[var(--primary-color)]" />
                    <h1 className="text-xl font-bold text-slate-800">Parceiros</h1>
                </div>
                <Link
                    to="/admin/parceiros/new"
                    className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm hover:opacity-90 transition-all"
                >
                    <PlusCircle size={16} /> Novo Parceiro
                </Link>
            </header>

            <div className="p-4 max-w-lg mx-auto space-y-3">
                {loading && (
                    <div className="text-center py-12 text-slate-400">
                        <div className="w-8 h-8 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Carregando parceiros...
                    </div>
                )}

                {!loading && partners.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <Handshake size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhum parceiro cadastrado.</p>
                        <Link to="/admin/parceiros/new" className="mt-4 inline-block text-[var(--primary-color)] font-bold text-sm">
                            + Cadastrar primeiro parceiro
                        </Link>
                    </div>
                )}

                {partners.map(partner => (
                    <div key={partner.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="flex gap-3 p-4">
                            {partner.logo_url ? (
                                <img
                                    src={partner.logo_url}
                                    alt={partner.name}
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-slate-50"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <Handshake size={20} className="text-slate-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{partner.name}</h3>
                                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${partner.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {partner.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                {partner.category && (
                                    <span className="text-[10px] text-[var(--primary-color)] font-semibold uppercase tracking-wide">{partner.category}</span>
                                )}
                                {partner.description && (
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{partner.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex border-t border-slate-50">
                            <a
                                href="/parceiros"
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-[var(--primary-color)] flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Eye size={14} /> Ver
                            </a>
                            <Link
                                to={`/admin/parceiros/edit/${partner.id}`}
                                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-[var(--primary-color)] flex items-center justify-center gap-1.5 transition-colors border-l border-slate-50"
                            >
                                <Pencil size={14} /> Editar
                            </Link>
                            <button
                                onClick={() => setDeleteConfirm(partner.id)}
                                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-red-500 flex items-center justify-center gap-1.5 transition-colors border-l border-slate-50"
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
                        <div className="text-4xl mb-3">🗑️</div>
                        <h3 className="font-bold text-slate-800 mb-1">Excluir parceiro?</h3>
                        <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerList;

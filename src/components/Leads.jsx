
import React, { useState } from 'react';
import { Phone, MessageCircle, Calendar, User, Tag, PlusCircle, X, Save, Trash2, Loader2 } from 'lucide-react';
import { useLeads } from '../contexts/LeadContext';

const Leads = () => {
    const { leads, loading, addLead, updateLead, deleteLead } = useLeads();
    const [activeTab, setActiveTab] = useState('active');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLead, setNewLead] = useState({ name: '', phone: '', interest: '', budget: '', status: 'Quente' });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleAddLead = async () => {
        if (!newLead.name || !newLead.phone) return;
        const lead = {
            ...newLead,
            lastContact: 'Agora',
            archived: false,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newLead.name)}&background=cbd5e1&color=334155`
        };
        await addLead(lead);
        setNewLead({ name: '', phone: '', interest: '', budget: '', status: 'Quente' });
        setShowAddModal(false);
    };

    const toggleArchive = (id) => {
        const lead = leads.find(l => l.id === id);
        updateLead(id, { archived: !lead.archived });
    };

    const handleWhatsApp = (lead) => {
        const text = `Olá ${lead.name}! Tudo bem? Entro em contato sobre: ${lead.interest || 'nossos imóveis'}`;
        window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleCall = (lead) => {
        window.open(`tel:+${lead.phone.replace(/\D/g, '')}`);
    };

    const handleSchedule = (lead) => {
        const text = `Agendamento com ${lead.name} - ${lead.interest}`;
        window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&details=${encodeURIComponent(`Lead: ${lead.name}\nTelefone: ${lead.phone}\nInteresse: ${lead.interest}\nOrçamento: ${lead.budget}`)}`, '_blank');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Quente': return 'bg-red-100 text-red-600';
            case 'Agendado': return 'bg-blue-100 text-[var(--primary-color)]';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="animate-spin text-[var(--primary-color)]" size={40} />
            </div>
        );
    }

    const filteredLeads = leads.filter(l => activeTab === 'active' ? !l.archived : l.archived);
    const activeCount = leads.filter(l => !l.archived).length;

    return (
        <div className="pb-24 min-h-screen bg-slate-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-slate-800">Gestão de Leads</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="text-[var(--primary-color)] flex items-center gap-1 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
                    >
                        <PlusCircle size={16} /> Novo Lead
                    </button>
                </div>
                <div className="flex gap-4 mt-4 text-sm font-medium text-slate-500 border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-2 px-1 ${activeTab === 'active' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'hover:text-slate-700'}`}
                    >
                        Ativos ({activeCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('archived')}
                        className={`pb-2 px-1 ${activeTab === 'archived' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'hover:text-slate-700'}`}
                    >
                        Arquivados
                    </button>
                </div>
            </header>

            <div className="p-4 space-y-3 max-w-lg mx-auto">
                {filteredLeads.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <User size={40} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Nenhum lead {activeTab === 'active' ? 'ativo' : 'arquivado'}.</p>
                    </div>
                )}

                {filteredLeads.map((lead) => (
                    <div key={lead.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <h3 className="font-bold text-slate-800">{lead.name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Tag size={12} /> Interessado em: {lead.interest || 'N/D'}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getStatusColor(lead.status)}`}>
                                {lead.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
                            <span>Orçamento: <strong>{lead.budget || 'N/D'}</strong></span>
                            <span>•</span>
                            <span>Último: {lead.lastContact}</span>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-50">
                            <button
                                onClick={() => handleWhatsApp(lead)}
                                className="flex-1 bg-emerald-50 text-emerald-600 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
                            >
                                <MessageCircle size={16} /> WhatsApp
                            </button>
                            <button
                                onClick={() => handleCall(lead)}
                                className="flex-1 bg-blue-50 text-blue-600 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                            >
                                <Phone size={16} /> Ligar
                            </button>
                            <button
                                onClick={() => handleSchedule(lead)}
                                className="w-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-100"
                                title="Agendar no Google Calendar"
                            >
                                <Calendar size={16} />
                            </button>
                            <button
                                onClick={() => toggleArchive(lead.id)}
                                className="w-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center hover:bg-amber-100"
                                title={lead.archived ? "Reativar" : "Arquivar"}
                            >
                                {lead.archived ? '↩' : '📦'}
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(lead.id)}
                                className="w-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"
                                title="Excluir lead"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir lead?</h3>
                        <p className="text-sm text-slate-500 mb-6">Esta ação é irreversível e remove o lead do Supabase.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Cancelar</button>
                            <button onClick={() => { deleteLead(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Novo Lead</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={newLead.name}
                                    onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="Nome do lead"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Telefone/WhatsApp *</label>
                                <input
                                    type="text"
                                    value={newLead.phone}
                                    onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="5581999999999"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Interesse</label>
                                <input
                                    type="text"
                                    value={newLead.interest}
                                    onChange={e => setNewLead(p => ({ ...p, interest: e.target.value }))}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="Ex: Apartamento Boa Viagem"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Orçamento</label>
                                    <input
                                        type="text"
                                        value={newLead.budget}
                                        onChange={e => setNewLead(p => ({ ...p, budget: e.target.value }))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        placeholder="R$ 500k"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Temperatura</label>
                                    <select
                                        value={newLead.status}
                                        onChange={e => setNewLead(p => ({ ...p, status: e.target.value }))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    >
                                        <option value="Quente">🔥 Quente</option>
                                        <option value="Agendado">📅 Agendado</option>
                                        <option value="Frio">❄️ Frio</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAddLead}
                            className="w-full mt-4 py-3 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[var(--primary-dark)] transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> Salvar Lead
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leads;

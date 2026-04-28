
import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Phone, Mail, MapPin, Tag,
    Edit, Trash2, X, Save, Search, Building2,
    Briefcase, UserCheck, ChevronDown, MessageCircle, RotateCcw, Loader2
} from 'lucide-react';
import { usePeople } from '../contexts/PeopleContext';

const TABS = [
    { key: 'clientes', label: 'Clientes', icon: Users, color: 'blue' },
    { key: 'corretores', label: 'Corretores', icon: Briefcase, color: 'emerald' },
    { key: 'colaboradores', label: 'Colaboradores', icon: UserCheck, color: 'purple' },
];

const emptyPerson = {
    name: '', phone: '', email: '', address: '', cpf: '',
    notes: '', role: '', creci: '', company: ''
};

const People = () => {
    const { people, loading, addPerson, updatePerson, deletePerson, refreshPeople } = usePeople();
    const [activeTab, setActiveTab] = useState('clientes');
    const [showModal, setShowModal] = useState(false);
    const [editingPerson, setEditingPerson] = useState(null);
    const [form, setForm] = useState({ ...emptyPerson });
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshPeople();
        setIsRefreshing(false);
    };

    const openAdd = () => {
        setEditingPerson(null);
        setForm({ ...emptyPerson });
        setShowModal(true);
    };

    const openEdit = (person) => {
        setEditingPerson(person);
        setForm({ ...person });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.phone) return;

        if (editingPerson) {
            await updatePerson(activeTab, editingPerson.id, form);
        } else {
            await addPerson(activeTab, form);
        }
        setShowModal(false);
        setForm({ ...emptyPerson });
    };

    const handleDelete = async (id) => {
        await deletePerson(activeTab, id);
        setShowDeleteConfirm(null);
    };

    const handleWhatsApp = (person) => {
        window.open(`https://wa.me/${person.phone.replace(/\D/g, '')}`, '_blank');
    };

    const handleCall = (person) => {
        window.open(`tel:+${person.phone.replace(/\D/g, '')}`);
    };

    const currentTab = TABS.find(t => t.key === activeTab);
    const filteredPeople = (people[activeTab] || []).filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="animate-spin text-[var(--primary-color)]" size={40} />
            </div>
        );
    }

    return (
        <div className="pb-24 min-h-screen bg-slate-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-[var(--primary-color)]" /> Cadastro de Pessoas
                    </h1>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                            title="Atualizar pessoas"
                        >
                            <RotateCcw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={openAdd}
                            className="text-[var(--primary-color)] flex items-center gap-1 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                        >
                            <UserPlus size={16} /> Adicionar
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${activeTab === tab.key
                                ? 'bg-white text-[var(--primary-color)] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={14} /> {tab.label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100 text-[var(--primary-color)]' : 'bg-slate-200 text-slate-500'
                                }`}>
                                {(people[tab.key] || []).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="mt-3 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`Buscar ${currentTab.label.toLowerCase()}...`}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                </div>
            </header>

            <div className="p-4 space-y-3 max-w-lg mx-auto">
                {filteredPeople.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <currentTab.icon size={40} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Nenhum(a) {currentTab.label.toLowerCase().slice(0, -1)} cadastrado(a).</p>
                        <button onClick={openAdd} className="mt-4 text-[var(--primary-color)] font-bold text-sm">+ Adicionar Agora</button>
                    </div>
                )}

                {filteredPeople.map(person => (
                    <div key={person.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{person.name}</h3>
                                    {person.role && <p className="text-[10px] text-slate-400 font-bold uppercase">{person.role}</p>}
                                    {person.creci && <p className="text-[10px] text-emerald-600 font-bold">{person.creci}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(person)} className="text-[var(--primary-color)] p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Editar">
                                    <Edit size={14} />
                                </button>
                                <button onClick={() => setShowDeleteConfirm(person.id)} className="text-red-500 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Excluir">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg mb-3">
                            {person.phone && <p className="flex items-center gap-2"><Phone size={12} /> {person.phone}</p>}
                            {person.email && <p className="flex items-center gap-2"><Mail size={12} /> {person.email}</p>}
                            {person.address && <p className="flex items-center gap-2"><MapPin size={12} /> {person.address}</p>}
                            {person.cpf && <p className="flex items-center gap-2"><Tag size={12} /> CPF: {person.cpf}</p>}
                            {person.company && <p className="flex items-center gap-2"><Building2 size={12} /> {person.company}</p>}
                        </div>

                        {person.notes && (
                            <p className="text-xs text-slate-400 italic mb-3">📝 {person.notes}</p>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-slate-50">
                            <button
                                onClick={() => handleWhatsApp(person)}
                                className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                            >
                                <MessageCircle size={14} /> WhatsApp
                            </button>
                            <button
                                onClick={() => handleCall(person)}
                                className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors"
                            >
                                <Phone size={14} /> Ligar
                            </button>
                            {person.email && (
                                <a
                                    href={`mailto:${person.email}`}
                                    className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors"
                                >
                                    <Mail size={14} /> Email
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingPerson ? 'Editar' : 'Novo(a)'} {currentTab.label.slice(0, -1)}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo *</label>
                                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Nome completo" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Telefone/WhatsApp *</label>
                                    <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="5581999999999" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="email@exemplo.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Endereço</label>
                                <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Bairro, Cidade" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">CPF</label>
                                    <input type="text" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="000.000.000-00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                        {activeTab === 'corretores' ? 'CRECI' : 'Cargo/Função'}
                                    </label>
                                    <input
                                        type="text"
                                        value={activeTab === 'corretores' ? form.creci : form.role}
                                        onChange={e => setForm(p => ({
                                            ...p,
                                            [activeTab === 'corretores' ? 'creci' : 'role']: e.target.value
                                        }))}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                        placeholder={activeTab === 'corretores' ? 'CRECI 12345' : 'Ex: Marketing'}
                                    />
                                </div>
                            </div>

                            {activeTab !== 'clientes' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Empresa</label>
                                    <input type="text" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Nome da empresa" />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Observações</label>
                                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-20 resize-none" placeholder="Informações adicionais..." />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full mt-4 py-3 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> {editingPerson ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-bounce-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir registro?</h3>
                        <p className="text-sm text-slate-500 mb-6">Esta ação é irreversível.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Cancelar</button>
                            <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default People;

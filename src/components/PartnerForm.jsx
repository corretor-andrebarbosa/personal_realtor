
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, RefreshCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePartners } from '../contexts/PartnerContext';

const CATEGORIES = [
    'Financiamento Imobiliário',
    'Seguros',
    'Decoração e Reforma',
    'Mudança',
    'Documentação e Cartório',
    'Arquitetura e Engenharia',
    'Advocacia Imobiliária',
    'Limpeza e Manutenção',
    'Outros',
];

const PartnerForm = () => {
    const { addPartner, updatePartner, partners } = usePartners();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name: '',
        category: 'Financiamento Imobiliário',
        description: '',
        tip_content: '',
        logo_url: '',
        website_url: '',
        whatsapp: '',
        status: 'active',
    });

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!isEditing) return;
        const existing = partners.find(p => String(p.id) === String(id));
        if (existing) {
            setFormData({
                name: existing.name || '',
                category: existing.category || 'Financiamento Imobiliário',
                description: existing.description || '',
                tip_content: existing.tip_content || '',
                logo_url: existing.logo_url || '',
                website_url: existing.website_url || '',
                whatsapp: existing.whatsapp || '',
                status: existing.status || 'active',
            });
        }
    }, [id, isEditing, partners]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) { setSaveError('O nome do parceiro é obrigatório.'); return; }

        setSaving(true);
        setSaveError('');

        const result = isEditing
            ? await updatePartner(Number(id), formData)
            : await addPartner(formData);

        setSaving(false);

        if (result === true) {
            setSaved(true);
            setTimeout(() => navigate('/admin/parceiros'), 1200);
        } else {
            setSaveError(typeof result === 'string' ? result : 'Erro ao salvar parceiro.');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-24">
            <header className="fixed top-0 left-0 w-full bg-white z-10 shadow-sm px-4 py-3 flex items-center gap-4">
                <Link to="/admin/parceiros" className="text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Parceiro' : 'Novo Parceiro'}</h1>
            </header>

            {saved && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-lg font-bold text-slate-800">Parceiro salvo!</h3>
                        <p className="text-sm text-slate-500">Redirecionando...</p>
                    </div>
                </div>
            )}

            {saveError && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSaveError('')}>
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-lg font-bold text-amber-600">Erro ao salvar</h3>
                        <p className="text-xs text-slate-500 mt-2">{saveError}</p>
                        <button onClick={() => setSaveError('')} className="mt-6 w-full py-3 bg-amber-500 text-white rounded-xl font-bold">Entendido</button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="pt-20 px-4 max-w-lg mx-auto space-y-5">

                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[var(--primary-color)]">Dados do Parceiro</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nome *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                                placeholder="Ex: Construtora XYZ Financiamentos"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Resumo (aparece no card)</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={2}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none resize-none"
                                placeholder="Uma frase curta descrevendo o produto ou serviço..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none text-sm"
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none text-sm"
                                >
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">URL do Logo</label>
                            <input
                                type="url"
                                name="logo_url"
                                value={formData.logo_url}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                                placeholder="https://..."
                            />
                            {formData.logo_url && (
                                <img src={formData.logo_url} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-xl bg-slate-50" onError={e => e.target.style.display = 'none'} />
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Site do parceiro</label>
                            <input
                                type="url"
                                name="website_url"
                                value={formData.website_url}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">WhatsApp (com DDI e DDD, só números)</label>
                            <input
                                type="text"
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                                placeholder="Ex: 5583999999999"
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">Dica (opcional)</h2>
                    <p className="text-xs text-slate-400 mb-3">Um texto mais completo com dicas sobre o produto ou serviço deste parceiro. Separe os parágrafos com uma linha em branco.</p>
                    <textarea
                        name="tip_content"
                        value={formData.tip_content}
                        onChange={handleChange}
                        rows={10}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none resize-none leading-relaxed text-sm"
                        placeholder="Escreva aqui uma dica completa sobre este parceiro..."
                    />
                </section>

                <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                    <div className="flex gap-4 max-w-lg mx-auto">
                        <button type="button" onClick={() => navigate('/admin/parceiros')} className="flex-1 py-3 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:opacity-90'}`}
                        >
                            {saving ? <><RefreshCcw size={18} className="animate-spin" /> Salvando...</> : <><Save size={18} /> {isEditing ? 'Salvar Alterações' : 'Cadastrar Parceiro'}</>}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PartnerForm;

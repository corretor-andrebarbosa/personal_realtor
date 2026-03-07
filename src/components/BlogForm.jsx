
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, RefreshCcw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBlog } from '../contexts/BlogContext';

const CATEGORIES = [
    'Mercado Imobiliário',
    'Dicas de Compra',
    'Dicas de Aluguel',
    'Investimento',
    'Financiamento',
    'Decoração e Reforma',
    'João Pessoa',
    'Notícias',
];

const toSlug = (str) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().trim()
        .replace(/[^a-z0-9\s]/g, ' ').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-');

const BlogForm = () => {
    const { addPost, updatePost, posts } = useBlog();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        cover_image: '',
        category: 'Mercado Imobiliário',
        author: 'André Barbosa',
        status: 'published',
    });
    const [slugManual, setSlugManual] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!isEditing) return;
        const existing = posts.find(p => String(p.id) === String(id));
        if (existing) {
            setSlugManual(true);
            setFormData({
                title: existing.title || '',
                slug: existing.slug || toSlug(existing.title || ''),
                excerpt: existing.excerpt || '',
                content: existing.content || '',
                cover_image: existing.cover_image || '',
                category: existing.category || 'Mercado Imobiliário',
                author: existing.author || 'André Barbosa',
                status: existing.status || 'published',
            });
        }
    }, [id, isEditing, posts]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'title' && !slugManual) updated.slug = toSlug(value);
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) { setSaveError('O título é obrigatório.'); return; }
        if (!formData.content.trim()) { setSaveError('O conteúdo é obrigatório.'); return; }

        setSaving(true);
        setSaveError('');

        const result = isEditing
            ? await updatePost(Number(id), formData)
            : await addPost(formData);

        setSaving(false);

        if (result === true) {
            setSaved(true);
            setTimeout(() => navigate('/admin/blog'), 1200);
        } else {
            setSaveError(typeof result === 'string' ? result : 'Erro ao salvar artigo.');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen pb-24">
            <header className="fixed top-0 left-0 w-full bg-white z-10 shadow-sm px-4 py-3 flex items-center gap-4">
                <Link to="/admin/blog" className="text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Artigo' : 'Novo Artigo'}</h1>
            </header>

            {saved && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-lg font-bold text-slate-800">Artigo salvo!</h3>
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

                {/* Informações básicas */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-[var(--primary-color)]">Informações do Artigo</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Título *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                                placeholder="Ex: 5 dicas para comprar seu primeiro apartamento"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">URL do artigo (slug)</label>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-[var(--primary-color)]">
                                <span className="text-xs text-slate-400 pl-3 pr-1 whitespace-nowrap">/blog/</span>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={e => { setSlugManual(true); setFormData(prev => ({ ...prev, slug: e.target.value })); }}
                                    className="flex-1 p-3 pl-0 bg-transparent outline-none text-xs font-mono text-slate-700"
                                    placeholder="gerado-automaticamente-do-titulo"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Resumo (aparece nos cards)</label>
                            <textarea
                                name="excerpt"
                                value={formData.excerpt}
                                onChange={handleChange}
                                rows={2}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none resize-none"
                                placeholder="Uma frase curta descrevendo o artigo..."
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
                                    <option value="published">Publicado</option>
                                    <option value="draft">Rascunho</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Autor</label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">URL da Imagem de Capa</label>
                            <input
                                type="url"
                                name="cover_image"
                                value={formData.cover_image}
                                onChange={handleChange}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none"
                                placeholder="https://..."
                            />
                            {formData.cover_image && (
                                <img src={formData.cover_image} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-xl" onError={e => e.target.style.display = 'none'} />
                            )}
                        </div>
                    </div>
                </section>

                {/* Conteúdo */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">Conteúdo *</h2>
                    <p className="text-xs text-slate-400 mb-1">Separe os parágrafos com uma linha em branco. O texto será traduzido automaticamente para o idioma do visitante.</p>
                    <p className="text-xs text-slate-400 mb-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        📷 <strong>Imagem no meio do texto:</strong> em uma linha separada, escreva <code className="bg-slate-200 px-1 rounded">[img:https://url-da-imagem.jpg]</code>
                    </p>
                    <textarea
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        rows={18}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none resize-none leading-relaxed text-sm"
                        placeholder={`Escreva o artigo aqui...\n\nSepare os parágrafos com uma linha em branco.\n\nPara inserir uma imagem no meio do texto:\n\n[img:https://url-da-imagem.jpg]\n\nCada parágrafo será traduzido automaticamente.`}
                        required
                    />
                </section>

                {/* Botões */}
                <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                    <div className="flex gap-4 max-w-lg mx-auto">
                        <button type="button" onClick={() => navigate('/admin/blog')} className="flex-1 py-3 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:opacity-90'}`}
                        >
                            {saving ? <><RefreshCcw size={18} className="animate-spin" /> Salvando...</> : <><Save size={18} /> {isEditing ? 'Salvar Alterações' : 'Publicar Artigo'}</>}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default BlogForm;

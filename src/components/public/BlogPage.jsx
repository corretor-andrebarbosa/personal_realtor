
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown, X } from 'lucide-react';
import { useBlog } from '../../contexts/BlogContext';
import TranslatedText from '../common/TranslatedText';
import { translations } from '../../translations';
import { systemConfig } from '../../system-config';

const languages = [
    { code: 'pt', label: 'Português', flag: 'https://flagcdn.com/w40/br.png' },
    { code: 'en', label: 'English', flag: 'https://flagcdn.com/w40/us.png' },
    { code: 'de', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
    { code: 'es', label: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
];

const BlogPage = () => {
    const { posts, loading } = useBlog();
    const navigate = useNavigate();

    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('ab-lang');
        if (saved && translations[saved]) return saved;
        const browser = navigator.language.split('-')[0];
        return translations[browser] ? browser : 'pt';
    });
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    const t = (key) => (translations[lang] && translations[lang][key]) || (translations['pt'] && translations['pt'][key]) || key;

    const handleLangChange = (code) => {
        setLang(code);
        localStorage.setItem('ab-lang', code);
        setIsLangMenuOpen(false);
    };

    const publishedPosts = posts.filter(p => p.status === 'published');

    const formatDate = (d) => new Date(d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <div className="font-['Manrope'] antialiased bg-slate-50 min-h-screen">

            {/* Nav */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm py-4 px-6 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/newlogo.png" alt="Logo" className="h-10 object-contain" onError={e => e.target.style.display = 'none'} />
                </Link>

                <div className="flex items-center gap-4">
                    <Link to="/#imoveis" className="hidden md:block text-sm font-medium text-slate-600 hover:text-[#166b9c] transition-colors">
                        {t('nav_properties')}
                    </Link>
                    <span className="hidden md:block text-sm font-bold text-[var(--primary-color,#166b9c)]">Blog</span>
                    <Link to="/#contato" className="hidden md:block text-sm font-medium text-slate-600 hover:text-[#166b9c] transition-colors">
                        {t('nav_contact')}
                    </Link>

                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full hover:bg-slate-100 transition-all text-xs font-bold text-slate-600"
                        >
                            <img src={languages.find(l => l.code === lang)?.flag} alt={lang} className="w-4 h-3 object-cover rounded-sm" />
                            <span className="uppercase">{lang}</span>
                            <ChevronDown size={12} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLangMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                                {languages.map(l => (
                                    <button
                                        key={l.code}
                                        onClick={() => handleLangChange(l.code)}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${lang === l.code ? 'text-[#166b9c] font-bold' : 'text-slate-600'}`}
                                    >
                                        <img src={l.flag} alt={l.label} className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div className="bg-white border-b border-slate-100 py-14 px-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <BookOpen size={28} className="text-[#166b9c]" />
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800">
                        <TranslatedText lang={lang}>Blog Imobiliário</TranslatedText>
                    </h1>
                </div>
                <p className="text-slate-500 max-w-xl mx-auto">
                    <TranslatedText lang={lang}>Dicas, tendências e informações sobre o mercado imobiliário de João Pessoa e região.</TranslatedText>
                </p>
            </div>

            {/* Posts */}
            <div className="max-w-5xl mx-auto px-4 py-12">
                {loading && (
                    <div className="text-center py-20 text-slate-400">
                        <div className="w-10 h-10 border-2 border-[#166b9c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    </div>
                )}

                {!loading && publishedPosts.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">
                            <TranslatedText lang={lang}>Nenhum artigo publicado ainda.</TranslatedText>
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publishedPosts.map(post => (
                        <Link
                            key={post.id}
                            to={`/blog/${post.id}`}
                            className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1"
                        >
                            {post.cover_image ? (
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={post.cover_image}
                                        alt={post.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={e => e.target.parentElement.style.display = 'none'}
                                    />
                                    {post.category && (
                                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#166b9c] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
                                            <TranslatedText lang={lang}>{post.category}</TranslatedText>
                                        </span>
                                    )}
                                </div>
                            ) : post.category && (
                                <div className="px-5 pt-5">
                                    <span className="text-[#166b9c] text-[10px] font-bold uppercase tracking-wider">
                                        <TranslatedText lang={lang}>{post.category}</TranslatedText>
                                    </span>
                                </div>
                            )}

                            <div className="p-5">
                                <h2 className="font-bold text-slate-800 text-base leading-snug mb-2 group-hover:text-[#166b9c] transition-colors line-clamp-2">
                                    <TranslatedText lang={lang}>{post.title}</TranslatedText>
                                </h2>
                                {post.excerpt && (
                                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-4">
                                        <TranslatedText lang={lang}>{post.excerpt}</TranslatedText>
                                    </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-50">
                                    <span>{formatDate(post.created_at)}</span>
                                    <span className="flex items-center gap-1 text-[#166b9c] font-bold">
                                        <TranslatedText lang={lang}>Ler artigo</TranslatedText>
                                        <ArrowRight size={12} />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-400 text-center py-8 text-sm">
                <p>© {new Date().getFullYear()} {systemConfig.brokerName} · <TranslatedText lang={lang}>Todos os direitos reservados</TranslatedText></p>
                <Link to="/" className="mt-2 inline-block text-slate-400 hover:text-white transition-colors text-xs">
                    ← <TranslatedText lang={lang}>Voltar ao site</TranslatedText>
                </Link>
            </footer>
        </div>
    );
};

export default BlogPage;

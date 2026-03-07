
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag, ChevronDown } from 'lucide-react';
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

const BlogPostPage = () => {
    const { id } = useParams();
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

    const post = posts.find(p => String(p.id) === String(id));

    useEffect(() => {
        if (!loading && !post) navigate('/blog', { replace: true });
    }, [loading, post, navigate]);

    const formatDate = (d) => new Date(d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    // Split content by double newline; detect [img:URL] blocks for inline images
    const paragraphs = (post?.content || '').split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    const IMG_RE = /^\[img:(https?:\/\/[^\]]+)\]$/i;

    if (loading) {
        return (
            <div className="font-['Manrope'] min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[#166b9c] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!post) return null;

    return (
        <div className="font-['Manrope'] antialiased bg-slate-50 min-h-screen">

            {/* Nav */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm py-4 px-6 flex justify-between items-center">
                <Link to="/blog" className="flex items-center gap-2 text-slate-600 hover:text-[#166b9c] transition-colors font-medium text-sm">
                    <ArrowLeft size={18} />
                    <span className="hidden md:inline"><TranslatedText lang={lang}>Voltar ao Blog</TranslatedText></span>
                    <span className="md:hidden">Blog</span>
                </Link>

                <Link to="/">
                    <img src="/newlogo.png" alt="Logo" className="h-8 object-contain" onError={e => e.target.style.display = 'none'} />
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
            </nav>

            {/* Cover image */}
            {post.cover_image && (
                <div className="w-full h-64 md:h-96 overflow-hidden">
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        onError={e => e.target.parentElement.style.display = 'none'}
                    />
                </div>
            )}

            {/* Article */}
            <article className="max-w-2xl mx-auto px-4 py-10">

                {/* Category */}
                {post.category && (
                    <div className="flex items-center gap-1.5 text-[#166b9c] text-xs font-bold uppercase tracking-widest mb-4">
                        <Tag size={12} />
                        <TranslatedText lang={lang}>{post.category}</TranslatedText>
                    </div>
                )}

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
                    <TranslatedText lang={lang}>{post.title}</TranslatedText>
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-8 pb-8 border-b border-slate-100">
                    <span className="flex items-center gap-1.5">
                        <User size={14} />
                        {post.author || systemConfig.brokerName}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {formatDate(post.created_at)}
                    </span>
                </div>

                {/* Excerpt */}
                {post.excerpt && (
                    <p className="text-lg text-slate-600 font-medium leading-relaxed mb-8 italic border-l-4 border-[#166b9c] pl-4">
                        <TranslatedText lang={lang}>{post.excerpt}</TranslatedText>
                    </p>
                )}

                {/* Content — translated paragraph by paragraph; [img:URL] renders as image */}
                <div className="prose prose-slate max-w-none space-y-5">
                    {paragraphs.map((para, i) => {
                        const imgMatch = para.match(IMG_RE);
                        if (imgMatch) {
                            return (
                                <img
                                    key={i}
                                    src={imgMatch[1]}
                                    alt=""
                                    className="w-full rounded-xl object-cover my-2"
                                    onError={e => e.target.style.display = 'none'}
                                />
                            );
                        }
                        return (
                            <p key={i} className="text-slate-700 leading-relaxed text-base">
                                <TranslatedText lang={lang}>{para}</TranslatedText>
                            </p>
                        );
                    })}
                </div>

                {/* Back link */}
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <Link
                        to="/blog"
                        className="inline-flex items-center gap-2 text-[#166b9c] font-bold hover:underline"
                    >
                        <ArrowLeft size={16} />
                        <TranslatedText lang={lang}>Ver todos os artigos</TranslatedText>
                    </Link>
                </div>
            </article>

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-400 text-center py-8 text-sm mt-8">
                <p>© {new Date().getFullYear()} {systemConfig.brokerName} · <TranslatedText lang={lang}>Todos os direitos reservados</TranslatedText></p>
            </footer>
        </div>
    );
};

export default BlogPostPage;

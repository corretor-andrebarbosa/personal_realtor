
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Handshake, ChevronDown, Globe, MessageCircle } from 'lucide-react';
import { usePartners } from '../../contexts/PartnerContext';
import TranslatedText from '../common/TranslatedText';
import { translations } from '../../translations';
import { systemConfig } from '../../system-config';

const languages = [
    { code: 'pt', label: 'Português', flag: 'https://flagcdn.com/w40/br.png' },
    { code: 'en', label: 'English', flag: 'https://flagcdn.com/w40/us.png' },
    { code: 'de', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
    { code: 'es', label: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
];

const buildWaLink = (whatsapp, partnerName) => {
    const digits = (whatsapp || '').replace(/\D/g, '');
    if (!digits) return null;
    const msg = encodeURIComponent(`Olá! Vi a indicação de ${partnerName} no site do André Barbosa Imóveis e gostaria de mais informações.`);
    return `https://wa.me/${digits}?text=${msg}`;
};

const PartnersPage = () => {
    const { partners, loading } = usePartners();

    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('ab-lang');
        if (saved && translations[saved]) return saved;
        const browser = navigator.language.split('-')[0];
        return translations[browser] ? browser : 'pt';
    });
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [activeCategory, setActiveCategory] = useState('Todos');

    const t = (key) => (translations[lang] && translations[lang][key]) || (translations['pt'] && translations['pt'][key]) || key;

    const handleLangChange = (code) => {
        setLang(code);
        localStorage.setItem('ab-lang', code);
        setIsLangMenuOpen(false);
    };

    const activePartners = partners.filter(p => p.status === 'active');
    const categories = ['Todos', ...Array.from(new Set(activePartners.map(p => p.category).filter(Boolean)))];
    const visiblePartners = activeCategory === 'Todos'
        ? activePartners
        : activePartners.filter(p => p.category === activeCategory);

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="font-['Manrope'] antialiased bg-slate-50 min-h-screen">

            {/* Nav */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm py-4 px-6 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/newlogo2.png" alt="Logo" className="h-10 object-contain" onError={e => e.target.style.display = 'none'} />
                </Link>

                <div className="flex items-center gap-4">
                    <Link to="/#imoveis" className="hidden md:block text-sm font-medium text-slate-600 hover:text-[#166b9c] transition-colors">
                        {t('nav_properties')}
                    </Link>
                    <span className="hidden md:block text-sm font-bold text-[var(--primary-color,#166b9c)]">Parceiros</span>
                    <Link to="/#contato" className="hidden md:block text-sm font-medium text-slate-600 hover:text-[#166b9c] transition-colors">
                        {t('nav_contact')}
                    </Link>

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
                    <Handshake size={28} className="text-[#166b9c]" />
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800">
                        <TranslatedText lang={lang}>Parceiros</TranslatedText>
                    </h1>
                </div>
                <p className="text-slate-500 max-w-xl mx-auto">
                    <TranslatedText lang={lang}>Produtos e serviços recomendados para quem está comprando, vendendo ou reformando um imóvel.</TranslatedText>
                </p>
            </div>

            {/* Filtro por categoria */}
            {categories.length > 1 && (
                <div className="max-w-5xl mx-auto px-4 pt-8 flex flex-wrap gap-2 justify-center">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeCategory === cat
                                ? 'bg-[#166b9c] text-white border-[#166b9c]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#166b9c]'}`}
                        >
                            <TranslatedText lang={lang}>{cat}</TranslatedText>
                        </button>
                    ))}
                </div>
            )}

            {/* Parceiros */}
            <div className="max-w-5xl mx-auto px-4 py-10">
                {loading && (
                    <div className="text-center py-20 text-slate-400">
                        <div className="w-10 h-10 border-2 border-[#166b9c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    </div>
                )}

                {!loading && visiblePartners.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <Handshake size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">
                            <TranslatedText lang={lang}>Nenhum parceiro cadastrado ainda.</TranslatedText>
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visiblePartners.map(partner => {
                        const waLink = buildWaLink(partner.whatsapp, partner.name);
                        const isExpanded = !!expanded[partner.id];
                        return (
                            <div
                                key={partner.id}
                                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all flex flex-col"
                            >
                                <div className="p-5 flex gap-4 items-start">
                                    {partner.logo_url ? (
                                        <img
                                            src={partner.logo_url}
                                            alt={partner.name}
                                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-slate-50"
                                            onError={e => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <Handshake size={22} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        {partner.category && (
                                            <span className="text-[10px] text-[#166b9c] font-bold uppercase tracking-wide">
                                                <TranslatedText lang={lang}>{partner.category}</TranslatedText>
                                            </span>
                                        )}
                                        <h2 className="font-bold text-slate-800 text-base leading-snug">{partner.name}</h2>
                                    </div>
                                </div>

                                {partner.description && (
                                    <p className="px-5 text-slate-500 text-sm leading-relaxed">
                                        <TranslatedText lang={lang}>{partner.description}</TranslatedText>
                                    </p>
                                )}

                                {partner.tip_content && (
                                    <div className="px-5 mt-3">
                                        <button
                                            onClick={() => toggleExpand(partner.id)}
                                            className="text-xs font-bold text-[#166b9c] flex items-center gap-1"
                                        >
                                            <TranslatedText lang={lang}>{isExpanded ? 'Ver menos' : 'Ver dica completa'}</TranslatedText>
                                            <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isExpanded && (
                                            <p className="text-slate-500 text-sm leading-relaxed mt-2 whitespace-pre-line">
                                                <TranslatedText lang={lang}>{partner.tip_content}</TranslatedText>
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto flex border-t border-slate-50 pt-3 px-5 pb-5 gap-2">
                                    {partner.website_url && (
                                        <a
                                            href={partner.website_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-[#166b9c] hover:text-[#166b9c] flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <Globe size={13} /> <TranslatedText lang={lang}>Site</TranslatedText>
                                        </a>
                                    )}
                                    {waLink && (
                                        <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <MessageCircle size={13} /> WhatsApp
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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

export default PartnersPage;

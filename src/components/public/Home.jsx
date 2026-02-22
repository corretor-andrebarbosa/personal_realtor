import React, { useState, useEffect } from 'react';
import { useProperties } from '../../contexts/PropertyContext';
import { MapPin, ArrowUpRight, Phone, Instagram, Linkedin, MessageCircle, PlayCircle, Star, ShieldCheck, BedDouble, Bath, Car, Menu, X, Facebook, Youtube, User, LayoutDashboard, Settings as SettingsIcon, LogOut, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PropertyFilters from './PropertyFilters';

const PublicHome = () => {
    const { properties } = useProperties();
    const navigate = useNavigate();
    const [mobileMenu, setMobileMenu] = useState(false);
    const [filters, setFilters] = useState({});

    // Filter Logic
    const filteredProperties = properties.filter(p => {
        if (p.status !== 'Disponível') return false;

        // Contract filter
        if (filters.contract === 'venda') {
            const hasSalePrice = Number(p.price || p.salePrice || 0) > 0;
            if (p.contract !== 'venda' && p.contract !== 'ambos' && !hasSalePrice) return false;
        } else if (filters.contract === 'locacao') {
            const hasRentalPrice = Number(p.rentalPrice || 0) > 0;
            if (p.contract !== 'locacao' && p.contract !== 'ambos' && !hasRentalPrice) return false;
        }

        if (filters.type && p.type !== filters.type) return false;
        if (filters.bedrooms && p.rooms < parseInt(filters.bedrooms)) return false;
        if (filters.neighborhood && !p.address.toLowerCase().includes(filters.neighborhood.toLowerCase())) return false;
        if (filters.maxPrice) {
            const price = (filters.contract === 'locacao' || (p.contract === 'locacao' && !filters.contract)) ? (p.rentalPrice || 0) : (p.price || p.salePrice || 0);
            if (price > parseFloat(filters.maxPrice)) return false;
        }
        return true;
    });

    const isFiltering = Object.values(filters).some(Boolean);

    // Base filter: Only show properties that are "Available" and have at least a title
    const validProperties = properties.filter(p =>
        p.status === 'Disponível' && p.title
    );

    const displayedProperties = isFiltering ? filteredProperties.filter(p => validProperties.includes(p)) : validProperties;

    const [settings, setSettings] = useState({
        primaryColor: '#166b9c',
        logoUrl: '',
        whatsapp: '',
        profilePhoto: '',
        socials: { instagram: '', linkedin: '', facebook: '', youtube: '', tiktok: '' }
    });

    useEffect(() => {
        setSettings({
            primaryColor: localStorage.getItem('ab-primary-color') || '#166b9c',
            logoUrl: localStorage.getItem('ab-logo-url') || '',
            whatsapp: localStorage.getItem('ab-whatsapp') || '',
            profilePhoto: localStorage.getItem('ab-profile-photo') || '',
            socials: JSON.parse(localStorage.getItem('ab-socials') || '{"instagram":"","linkedin":"","facebook":"","youtube":"","tiktok":""}')
        });
    }, []);

    const whatsappLink = settings.whatsapp ? `https://wa.me/${settings.whatsapp}` : '#contato';

    const handleContactSubmit = (e) => {
        e.preventDefault();
        const phone = e.target.querySelector('input').value;
        if (settings.whatsapp) {
            window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Olá! Meu número é ${phone}. Gostaria de saber mais sobre seus imóveis.`)}`, '_blank');
        }
        e.target.querySelector('input').value = '';
    };

    return (
        <div className="font-[Manrope] min-h-screen bg-slate-50 flex flex-col scroll-smooth">

            {/* Navbar */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm py-4 px-6 flex justify-between items-center transition-all duration-300">
                <Link to="/website" className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <img
                            src={settings.logoUrl || '/_optimized/public/newlogo.webp'}
                            alt="Logo"
                            className="h-10 object-contain"
                            decoding="async"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.classList.remove('hidden');
                            }}
                        />
                        <span className="text-xl font-extrabold tracking-tight hidden" style={{ color: settings.primaryColor }}>
                            André Barbosa
                        </span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
                    <a href="#imoveis" className="hover:text-[#166b9c] transition-colors">Imóveis</a>
                    <a href="#sobre" className="hover:text-[#166b9c] transition-colors">Sobre</a>
                    <a href="#contato" className="hover:text-[#166b9c] transition-colors">Contato</a>

                    <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                        {settings.socials.instagram && (
                            <a href={`https://${settings.socials.instagram}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#E1306C] transition-colors"><Instagram size={20} /></a>
                        )}
                        {settings.socials.youtube && (
                            <a href={`https://${settings.socials.youtube}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#FF0000] transition-colors"><Youtube size={20} /></a>
                        )}
                    </div>

                    {localStorage.getItem('ab-auth-session') ? (
                        <div className="relative group ml-2">
                            <button className="flex items-center gap-2 text-slate-700 hover:text-[var(--primary-color)] font-bold transition-all py-1.5 px-3 rounded-full bg-slate-50 border border-slate-100">
                                <User size={16} />
                                <span>André</span>
                                <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                            </button>

                            {/* Dropdown Menu */}
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[var(--primary-color)] transition-colors">
                                    <LayoutDashboard size={16} /> Admin
                                </Link>
                                <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[var(--primary-color)] transition-colors">
                                    <SettingsIcon size={16} /> Configurações
                                </Link>
                                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('ab-auth-session');
                                        localStorage.removeItem('authToken');
                                        window.location.reload();
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={16} /> Sair
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Link to="/login" className="text-slate-500 hover:text-[#166b9c] font-bold transition-colors">
                            Login
                        </Link>
                    )}

                    <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-white px-5 py-2 rounded-full hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2" style={{ backgroundColor: settings.primaryColor }}>
                        <MessageCircle size={18} /> Fale Comigo
                    </a>
                </div>

                {/* Mobile hamburger */}
                <button className="md:hidden text-slate-600" onClick={() => setMobileMenu(!mobileMenu)}>
                    {mobileMenu ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav >

            {/* Mobile Menu */}
            {
                mobileMenu && (
                    <div className="md:hidden fixed inset-0 top-[65px] bg-white z-40 p-6 flex flex-col gap-4">
                        <a href="#imoveis" onClick={() => setMobileMenu(false)} className="text-lg font-bold text-slate-700 py-2 border-b border-slate-100">Imóveis</a>
                        <a href="#sobre" onClick={() => setMobileMenu(false)} className="text-lg font-bold text-slate-700 py-2 border-b border-slate-100">Sobre</a>
                        <a href="#contato" onClick={() => setMobileMenu(false)} className="text-lg font-bold text-slate-700 py-2 border-b border-slate-100">Contato</a>
                        {localStorage.getItem('ab-auth-session') ? (
                            <>
                                <Link to="/admin" onClick={() => setMobileMenu(false)} className="text-lg font-bold text-slate-700 py-2 border-b border-slate-100 flex items-center gap-2">
                                    <LayoutDashboard size={20} /> Painel Admin
                                </Link>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('ab-auth-session');
                                        localStorage.removeItem('authToken');
                                        window.location.reload();
                                    }}
                                    className="text-lg font-bold text-red-500 py-2 border-b border-slate-100 flex items-center gap-2 text-left"
                                >
                                    <LogOut size={20} /> Sair
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setMobileMenu(false)} className="text-lg font-bold text-slate-700 py-2 border-b border-slate-100">Login</Link>
                        )}
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white text-center px-6 py-3 rounded-full font-bold shadow-lg mt-4 flex items-center justify-center gap-2"
                            style={{ backgroundColor: settings.primaryColor }}
                        >
                            <MessageCircle size={20} /> Fale Comigo
                        </a>
                        <div className="flex gap-4 justify-center mt-4">
                            {settings.socials.instagram && <a href={`https://${settings.socials.instagram}`} target="_blank" rel="noreferrer"><Instagram size={24} className="text-slate-400" /></a>}
                            {settings.socials.youtube && <a href={`https://${settings.socials.youtube}`} target="_blank" rel="noreferrer"><Youtube size={24} className="text-slate-400" /></a>}
                        </div>
                    </div>
                )
            }

            {/* Hero Section */}
            <header className="relative h-[600px] flex items-center justify-center text-center px-4 overflow-hidden group">
                <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1600"
                    alt="Imóveis de alto padrão"
                    className="absolute top-0 left-0 w-full h-full object-cover z-0 transition-transform duration-[10s] ease-linear group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70 z-10"></div>

                <div className="relative z-20 max-w-3xl">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg leading-tight">
                        Exclusividade e Alto Padrão em Cada Detalhe
                    </h1>
                    <p className="text-lg md:text-xl text-slate-100 mb-8 font-light leading-relaxed max-w-2xl mx-auto">
                        Sua jornada para encontrar o imóvel perfeito começa aqui. Atendimento personalizado em João Pessoa e região.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="#imoveis" className="text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg hover:shadow-cyan-500/50 hover:-translate-y-1" style={{ backgroundColor: settings.primaryColor }}>
                            Ver Oportunidades
                        </a>
                        <a href={whatsappLink} target="_blank" rel="noreferrer" className="bg-white/10 backdrop-blur border border-white/30 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-slate-800 transition-all flex items-center gap-2 justify-center">
                            <PlayCircle size={20} /> Agendar Visita
                        </a>
                    </div>
                </div>
            </header>

            <PropertyFilters onFilterChange={setFilters} />

            {/* Trust badges */}
            <div className="bg-white py-6 px-4 border-b border-slate-100">
                <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8 md:gap-16 text-center">
                    <div>
                        <p className="text-2xl font-extrabold text-slate-800">{properties.length}+</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Imóveis Cadastrados</p>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-800">100%</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Atendimento Personalizado</p>
                    </div>
                    <div>
                        <p className="text-2xl font-extrabold text-slate-800">⭐ 5.0</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Avaliação dos Clientes</p>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <section id="sobre" className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="relative group cursor-pointer overflow-hidden rounded-2xl shadow-2xl">
                        <img
                            src={settings.profilePhoto || '/_optimized/public/profile.webp'}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://ui-avatars.com/api/?name=Sua+Foto&size=500&background=cbd5e1&color=334155&font-size=0.1";
                            }}
                            alt="Sua Foto"
                            className="relative z-10 w-full object-cover aspect-[4/5] bg-slate-200"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: settings.primaryColor }}>
                            <ShieldCheck size={18} /> Sobre Mim
                        </h2>
                        <h3 className="text-4xl font-extrabold text-slate-800 mb-6 leading-tight">
                            Compromisso com a sua conquista e satisfação.
                        </h3>
                        <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                            <p className="font-bold text-slate-800">
                                Corretor de Imóveis de Alto Padrão | Atendimento Internacional
                            </p>
                            <p>
                                Especialista em imóveis de luxo, com atendimento exclusivo a clientes nacionais e internacionais.
                                Fala <strong>Inglês, Alemão e Espanhol</strong>, oferece comunicação clara, segura e personalizada em negociações de alto valor.
                            </p>
                            <p>
                                Com sólido conhecimento jurídico aplicado ao mercado imobiliário, garante segurança contratual,
                                confidencialidade e estruturação estratégica de investimentos, proporcionando total tranquilidade em cada etapa da operação.
                            </p>
                            <p>
                                Atua com discrição, excelência e foco em resultados, entregando uma experiência sofisticada, eficiente e orientada a investidores exigentes.
                            </p>
                        </div>

                        <div className="mt-8">
                            <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold hover:underline" style={{ color: settings.primaryColor }}>
                                Entre em contato agora <ArrowUpRight size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Properties */}
            <section id="imoveis" className="py-20 px-6 max-w-7xl mx-auto w-full">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-800 mb-4">{isFiltering ? `Resultados da Busca (${displayedProperties.length})` : 'Imóveis em Destaque'}</h2>
                    <div className="w-20 h-1 mx-auto rounded-full" style={{ backgroundColor: settings.primaryColor }}></div>
                    <p className="text-slate-500 mt-4 max-w-lg mx-auto">Seleção exclusiva dos melhores imóveis disponíveis para venda e locação.</p>
                </div>

                {displayedProperties.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <p className="text-lg">Nenhum imóvel disponível no momento.</p>
                        <p className="text-sm mt-2">Cadastre imóveis pelo painel administrativo.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayedProperties.map((property) => (
                            <div
                                key={property.id}
                                onClick={() => navigate(`/properties/${property.id}`)}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 group ring-1 ring-slate-100 hover:ring-2 cursor-pointer"
                                style={{ '--tw-ring-color': `${settings.primaryColor}20` }}
                            >
                                <div className="relative h-64 overflow-hidden bg-slate-100">
                                    <img
                                        src={property.image || (property.images && property.images.length > 0 ? property.images[0] : 'https://via.placeholder.com/600x400?text=Imóvel+S/Foto')}
                                        alt={property.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            if (e.target.src !== "https://ui-avatars.com/api/?name=IMOVEL&size=600&background=cbd5e1&color=334155") {
                                                e.target.src = "https://ui-avatars.com/api/?name=IMOVEL&size=600&background=cbd5e1&color=334155";
                                            }
                                        }}
                                    />
                                    <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-sm ${property.contract === 'locacao' ? 'bg-purple-500' : property.contract === 'ambos' ? 'bg-gradient-to-r from-purple-500 to-blue-500' : ''}`}
                                        style={{ backgroundColor: (property.contract === 'locacao' || property.contract === 'ambos') ? undefined : settings.primaryColor }}>
                                        {property.contract === 'locacao' ? 'Aluguel' : property.contract === 'ambos' ? 'Venda e Aluguel' : 'Venda'}
                                    </span>
                                    <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                    <div className="absolute bottom-4 left-4 text-white">
                                        {property.contract === 'ambos' ? (
                                            <>
                                                <p className="text-lg font-bold">
                                                    {(property.price || property.salePrice) ? `R$ ${(property.price || property.salePrice).toLocaleString('pt-BR')}` : 'Preço sob consulta'}
                                                </p>
                                                <p className="text-sm font-semibold text-white/80">
                                                    {property.rentalPrice ? `R$ ${property.rentalPrice.toLocaleString('pt-BR')}/mês` : ''}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-lg font-bold">
                                                {(property.price || property.rentalPrice)
                                                    ? `R$ ${(property.price || property.rentalPrice).toLocaleString('pt-BR')}${property.contract === 'locacao' ? '/mês' : ''}`
                                                    : 'Sob consulta'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:transition-colors" style={{ '--hover-color': settings.primaryColor }}>{property.title}</h3>
                                    <p className="text-slate-500 text-sm mb-4 flex items-center gap-2">
                                        <MapPin size={16} style={{ color: settings.primaryColor }} /> {property.address}
                                    </p>

                                    {/* Property specs */}
                                    <div className="flex gap-3 mb-4 text-slate-500 text-xs font-medium">
                                        {property.rooms > 0 && <span className="flex items-center gap-1"><BedDouble size={14} /> {property.rooms}</span>}
                                        {property.bathrooms > 0 && <span className="flex items-center gap-1"><Bath size={14} /> {property.bathrooms}</span>}
                                        {property.garage > 0 && <span className="flex items-center gap-1"><Car size={14} /> {property.garage}</span>}
                                        {property.area > 0 && <span>{property.area}m²</span>}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (settings.whatsapp) {
                                                window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel: ${property.title} - R$ ${(property.price || property.rentalPrice || 0).toLocaleString('pt-BR')}`)}`, '_blank');
                                            } else {
                                                window.location.href = '#contato';
                                            }
                                        }}
                                        className="w-full mt-2 bg-slate-50 text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:text-white hover:border-transparent transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                        style={{ '--tw-bg-opacity': 1 }}
                                        onMouseEnter={e => { e.target.style.backgroundColor = settings.primaryColor; e.target.style.color = 'white'; }}
                                        onMouseLeave={e => { e.target.style.backgroundColor = ''; e.target.style.color = ''; }}
                                    >
                                        Tenho Interesse <ArrowUpRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Floating WhatsApp Button */}
            <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
                title="Fale comigo no WhatsApp"
                style={{ animation: 'pulse 2s infinite' }}
            >
                <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </a>

            {/* Contact Section */}
            <section id="contato" className="py-20 px-6 text-white relative overflow-hidden" style={{ backgroundColor: settings.primaryColor }}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para encontrar seu novo lar?</h2>
                    <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                        Entre em contato agora mesmo. Atendimento personalizado em João Pessoa e região.
                    </p>

                    <form onSubmit={handleContactSubmit} className="max-w-md mx-auto bg-white/10 backdrop-blur-md p-2 rounded-2xl md:rounded-full flex flex-col md:flex-row border border-white/20 shadow-2xl hover:bg-white/20 transition-all focus-within:ring-4 focus-within:ring-white/30 gap-2">
                        <div className="flex-1 flex items-center px-4 py-2">
                            <MessageCircle className="text-blue-400 mr-2 shrink-0" size={20} />
                            <input
                                type="text"
                                placeholder="Seu WhatsApp (com DDD)..."
                                className="bg-transparent border-none text-white placeholder-white/50 focus:ring-0 w-full text-sm md:text-base outline-none"
                                required
                            />
                        </div>
                        <button className="bg-white text-slate-900 px-8 py-3 rounded-xl md:rounded-full font-bold hover:bg-blue-50 transition-colors shadow-lg">
                            Falar com André
                        </button>
                    </form>
                </div>
            </section>

            <footer className="bg-slate-900 text-slate-300 py-16 px-6 border-t border-slate-800">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
                        {/* Brand */}
                        <div>
                            <div className="relative flex items-start">
                                <img
                                    src={settings.logoUrl || '/_optimized/public/newlogo-white.webp'}
                                    alt="Logo"
                                    className={`h-10 object-contain mb-4 ${settings.logoUrl ? 'brightness-200' : ''}`}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.classList.remove('hidden');
                                    }}
                                />
                                <h3 className="text-xl font-extrabold text-white mb-4 hidden">André Barbosa</h3>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">Inteligência Imobiliária. Encontre o imóvel perfeito com atendimento personalizado e dedicado.</p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Links Rápidos</h4>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#imoveis" className="hover:text-white transition-colors">Imóveis</a></li>
                                <li><a href="#sobre" className="hover:text-white transition-colors">Sobre</a></li>
                                <li><a href="#contato" className="hover:text-white transition-colors">Contato</a></li>
                                <li><Link to="/login" className="hover:text-white transition-colors">Área do Corretor</Link></li>
                            </ul>
                        </div>

                        {/* Social */}
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Redes Sociais</h4>
                            <div className="flex gap-3 flex-wrap">
                                <a href={settings.socials.instagram ? `https://${settings.socials.instagram}` : '#'} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#E1306C] hover:text-white transition-all" title="Instagram">
                                    <Instagram size={18} />
                                </a>
                                <a href={settings.socials.youtube ? `https://${settings.socials.youtube}` : '#'} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-[#FF0000] hover:text-white transition-all" title="YouTube">
                                    <Youtube size={18} />
                                </a>
                            </div>
                            {settings.whatsapp && (
                                <a href={whatsappLink} target="_blank" rel="noreferrer" className="hidden mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                                    <MessageCircle size={16} /> WhatsApp: +{settings.whatsapp}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
                        <p>&copy; {new Date().getFullYear()} André Barbosa Inteligência Imobiliária. Powered by <span className="text-slate-400 font-bold">Kaleb</span>.</p>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default PublicHome;

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';
import {
    ArrowLeft, MapPin, BedDouble, Bath, Car,
    Share2, FileText, Video, Phone, MessageCircle,
    Edit, Trash2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import jsPDF from 'jspdf';

const PropertyDetails = () => {
    const { id } = useParams();
    const { properties, deleteProperty } = useProperties();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showGallery, setShowGallery] = useState(false);

    useEffect(() => {
        const found = properties.find(p => p.id == id);
        setProperty(found);
    }, [id, properties]);

    // Normalize images coming from different sources (local/offline, supabase jsonb, legacy)
    const normalizeImages = (p) => {
        if (!p) return [];
        const raw = p.images;

        // Supabase jsonb array should already be an Array
        if (Array.isArray(raw)) return raw.filter(Boolean);

        // Sometimes jsonb can be returned/kept as a JSON string
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch {
                // ignore
            }
        }

        // Sometimes it can be stored as an object with numeric keys
        if (raw && typeof raw === 'object') {
            const values = Object.values(raw).filter(Boolean);
            if (values.length) return values;
        }

        // Fallback to legacy single cover image
        return p.image ? [p.image] : [];
    };

    const allImages = normalizeImages(property);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC should always close overlays
            if (e.key === 'Escape') {
                if (showGallery) setShowGallery(false);
                if (showVideoModal) setShowVideoModal(false);
                return;
            }

            // Arrow navigation is only relevant when the gallery overlay is open
            if (!showGallery) return;

            const len = Array.isArray(allImages) ? allImages.length : 0;
            if (len <= 1) return;

            if (e.key === 'ArrowLeft') {
                setCurrentImageIndex(prev => {
                    const safePrev = Number.isFinite(prev) ? prev : 0;
                    return (safePrev - 1 + len) % len;
                });
            } else if (e.key === 'ArrowRight') {
                setCurrentImageIndex(prev => {
                    const safePrev = Number.isFinite(prev) ? prev : 0;
                    return (safePrev + 1) % len;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showGallery, showVideoModal, allImages]);

    const getYoutubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const generatePDF = () => {
        if (!property) return;
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(22, 107, 156);
        doc.text(property.title, 20, 20);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.text(`Endereço: ${property.address}`, 20, 35);
        doc.text(`Tipo: ${property.type || 'N/D'}`, 20, 45);
        doc.text(`Contrato: ${property.contract === 'locacao' ? 'Locação' : property.contract === 'ambos' ? 'Venda e Locação' : 'Venda'}`, 20, 55);
        if (property.contract === 'ambos') {
            doc.text(`Preço de Venda: R$ ${(property.price || property.salePrice || 0).toLocaleString('pt-BR')}`, 20, 65);
            doc.text(`Aluguel: R$ ${(property.rentalPrice || 0).toLocaleString('pt-BR')}/mês`, 20, 75);
        } else {
            doc.text(`Preço: R$ ${(property.price || property.rentalPrice || 0).toLocaleString('pt-BR')}${property.contract === 'locacao' ? '/mês' : ''}`, 20, 65);
        }
        doc.text(`Área: ${property.area}m²`, 20, 75);
        doc.text(`Quartos: ${property.rooms} | Banheiros: ${property.bathrooms} | Vagas: ${property.garage}`, 20, 85);

        if (property.description) {
            doc.text('Descrição:', 20, 100);
            const lines = doc.splitTextToSize(property.description, 170);
            doc.text(lines, 20, 110);
        }

        doc.save(`${property.title.replace(/\s+/g, '_')}_Ficha.pdf`);
    };

    const handleShare = async () => {
        const shareData = {
            title: property.title,
            text: `${property.title} - R$ ${(property.price || property.rentalPrice || 0).toLocaleString('pt-BR')} - ${property.address}`,
            url: window.location.href
        };
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
            alert('Link copiado para a área de transferência!');
        }
    };

    const handleDelete = async () => {
        await deleteProperty(id);
        navigate('/properties');
    };

    const handleWhatsApp = () => {
        const whatsapp = localStorage.getItem('ab-whatsapp') || '';
        const text = `Olá! Tenho interesse no imóvel: ${property.title} - R$ ${(property.price || property.rentalPrice || 0).toLocaleString('pt-BR')}`;
        if (whatsapp) {
            window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            alert('Número de WhatsApp não configurado. Vá em Configurações para definir.');
        }
    };

    const handleCall = () => {
        const whatsapp = localStorage.getItem('ab-whatsapp') || '';
        if (whatsapp) {
            window.open(`tel:+${whatsapp}`);
        } else {
            alert('Número de telefone não configurado. Vá em Configurações para definir.');
        }
    };

    const youtubeId = property ? getYoutubeId(property.videoLink || property.video) : null;

    if (!property) return <div className="p-10 text-center text-slate-400">Carregando...</div>;

    return (
        <div className="bg-slate-50 min-h-screen pb-24 relative">
            {/* Image Gallery / Header */}
            <div className="relative h-72 bg-slate-200">
                <Link to="/properties" className="absolute top-4 left-4 z-10 bg-white/80 p-2 rounded-full shadow-sm backdrop-blur">
                    <ArrowLeft size={20} className="text-slate-800" />
                </Link>

                {allImages.length > 0 ? (
                    <>
                        <img
                            src={allImages[currentImageIndex]}
                            alt={property.title}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setShowGallery(true)}
                        />

                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full shadow-sm z-10"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setCurrentImageIndex(i => (i + 1) % allImages.length)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur p-2 rounded-full shadow-sm z-10"
                                >
                                    <ChevronRight size={20} />
                                </button>

                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                    {allImages.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentImageIndex(i)}
                                            className={`w-2 h-2 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        <span className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-lg z-10">
                            {currentImageIndex + 1}/{allImages.length}
                        </span>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">Sem imagem</div>
                )}
            </div>

            {/* Action buttons on image */}
            <div className="absolute top-[240px] right-4 flex gap-2 z-10">
                <button onClick={handleShare} className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                    <Share2 size={14} /> Compartilhar
                </button>
                {youtubeId && (
                    <button onClick={() => setShowVideoModal(true)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                        <Video size={14} /> Vídeo
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="bg-white -mt-6 rounded-t-3xl relative p-6 shadow-sm min-h-[500px]">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>

                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-2xl font-bold text-slate-800 w-3/4 leading-tight">{property.title}</h1>
                    <div className="flex items-center gap-1">
                        <Link to={`/properties/edit/${property.id}`} className="text-[var(--primary-color)] p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="Editar">
                            <Edit size={18} />
                        </Link>
                        <button onClick={generatePDF} className="text-[var(--primary-color)] p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="Gerar PDF">
                            <FileText size={18} />
                        </button>
                        <button onClick={() => setShowDeleteModal(true)} className="text-red-500 p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors" title="Excluir">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <p className="text-slate-500 text-sm mb-6 flex items-center gap-1">
                    <MapPin size={16} className="text-[var(--primary-color)]" /> {property.address}
                </p>

                {/* Badges */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${property.status === 'Disponível' ? 'bg-emerald-100 text-emerald-700' :
                        property.status === 'Reservado' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {property.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 uppercase">
                        {property.contract === 'locacao' ? 'Locação' : property.contract === 'ambos' ? 'Venda e Locação' : 'Venda'}
                    </span>
                    {property.type && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 uppercase">
                            {property.type}
                        </span>
                    )}
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-6 overflow-x-auto pb-2 no-scrollbar">
                    <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <span className="text-slate-400"><BedDouble size={20} /></span>
                        <span className="font-bold text-slate-800 text-sm">{property.rooms} <span className="text-[10px] font-normal text-slate-400">Quartos</span></span>
                    </div>
                    <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <span className="text-slate-400"><Bath size={20} /></span>
                        <span className="font-bold text-slate-800 text-sm">{property.bathrooms} <span className="text-[10px] font-normal text-slate-400">Banheiros</span></span>
                    </div>
                    <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <span className="text-slate-400"><Car size={20} /></span>
                        <span className="font-bold text-slate-800 text-sm">{property.garage} <span className="text-[10px] font-normal text-slate-400">Vagas</span></span>
                    </div>
                    <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <span className="text-slate-400 font-serif font-bold text-lg">M²</span>
                        <span className="font-bold text-slate-800 text-sm">{property.area} <span className="text-[10px] font-normal text-slate-400">Área</span></span>
                    </div>
                </div>

                {/* Description */}
                <div className="mb-8">
                    <h3 className="font-bold text-slate-800 mb-2">Descrição</h3>
                    <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">
                        {property.description ||
                            `Este imóvel incrível localizado em ${property.address.split('-')[1] || 'João Pessoa - PB'} oferece todo o conforto e exclusividade. Com acabamento de alto padrão e localização privilegiada.`
                        }
                    </p>
                </div>

                {/* YouTube Video Embed */}
                {youtubeId && (
                    <div className="mb-8">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Video size={18} className="text-red-500" /> Vídeo do Imóvel</h3>
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md">
                            <iframe
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                title="Vídeo do Imóvel"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                )}

                <div className="mb-24">
                    <h3 className="font-bold text-slate-800 mb-2">Localização</h3>
                    <div className="h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-200">
                        📍 {property.address}
                    </div>
                </div>
            </div>

            {/* Floating Price & CTA */}
            <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 z-20">
                <div>
                    {property.contract === 'ambos' ? (
                        <>
                            <p className="text-xs font-bold text-slate-400 uppercase">Venda / Locação</p>
                            <p className="text-lg font-bold text-[var(--primary-color)]">
                                {(property.price || property.salePrice) ? `R$ ${(property.price || property.salePrice).toLocaleString('pt-BR')}` : 'Sob consulta'}
                            </p>
                            <p className="text-sm font-bold text-emerald-600">
                                {property.rentalPrice ? `R$ ${property.rentalPrice.toLocaleString('pt-BR')}/mês` : ''}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-xs font-bold text-slate-400 uppercase">Valor Total</p>
                            <p className="text-xl font-bold text-[var(--primary-color)]">
                                {(property.price || property.rentalPrice)
                                    ? `R$ ${(property.price || property.rentalPrice).toLocaleString('pt-BR')}${property.contract === 'locacao' ? '/mês' : ''}`
                                    : 'Sob consulta'}
                            </p>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleWhatsApp}
                        className="bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-[#128C7E] transition-all flex items-center gap-2 group"
                    >
                        <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                        WhatsApp
                    </button>
                    <button onClick={handleCall} className="bg-[var(--primary-color)] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2">
                        <Phone size={18} /> Ligar
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Imóvel?</h3>
                        <p className="text-sm text-slate-500 mb-6">Esta ação é irreversível. O imóvel "{property.title}" será removido permanentemente.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">Cancelar</button>
                            <button onClick={handleDelete} className="flex-1 py-2 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Gallery Modal */}
            {showGallery && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    <div className="flex justify-between items-center p-4">
                        <span className="text-white font-bold">{currentImageIndex + 1} / {allImages.length}</span>
                        <button onClick={() => setShowGallery(false)} className="text-white p-2">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                        <img src={allImages[currentImageIndex]} alt="" className="max-w-full max-h-full object-contain" />
                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                                    className="absolute left-4 bg-white/20 backdrop-blur p-3 rounded-full text-white"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={() => setCurrentImageIndex(i => (i + 1) % allImages.length)}
                                    className="absolute right-4 bg-white/20 backdrop-blur p-3 rounded-full text-white"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {showVideoModal && youtubeId && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowVideoModal(false)}>
                    <div className="w-full max-w-3xl aspect-video" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowVideoModal(false)} className="absolute top-4 right-4 text-white">
                            <X size={28} />
                        </button>
                        <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                            title="Vídeo"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            className="w-full h-full rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetails;

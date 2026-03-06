import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Share2,
  FileText,
  Video,
  Phone,
  MessageCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';

import { systemConfig } from '../system-config';
import { openWhatsApp } from '../whatsapp';
import { translations } from '../translations';
import TranslatedText from './common/TranslatedText';
import PriceDisplay from './common/PriceDisplay';

const isValidSession = () => {
  try {
    const sessionStr = localStorage.getItem('ab-auth-session');
    if (!sessionStr) return false;
    const session = JSON.parse(sessionStr);
    const thirtyMinutes = 30 * 60 * 1000;
    return (Date.now() - (session?.timestamp || 0)) < thirtyMinutes;
  } catch {
    return false;
  }
};

// Normaliza imagens vindas de qualquer lugar (Supabase/legacy/localStorage)
const normalizeImages = (p) => {
  if (!p) return [];

  // 1) tenta pegar “coleções” possíveis
  const candidates = [
    p.images,
    p.gallery,
    p.fotos,
    p.photos,
    p.imagens
  ].filter(v => v !== undefined && v !== null);

  // 2) tenta pegar “capa” possíveis
  const coverCandidates = [
    p.image,
    p.image_url,
    p.main_image,
    p.capa,
    p.foto_principal
  ].filter(Boolean);

  const out = [];

  const pushMany = (arr) => {
    arr
      .filter(Boolean)
      .forEach((x) => {
        if (typeof x === 'string' && x.trim()) out.push(x.trim());
      });
  };

  for (const raw of candidates) {
    // Array ok
    if (Array.isArray(raw)) {
      pushMany(raw);
      continue;
    }

    // string pode ser:
    // - URL direta
    // - JSON '["...","..."]'
    // - formato Postgres '{a,b,c}'
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) continue;

      // JSON array
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          pushMany(parsed);
          continue;
        }
      } catch {
        // ignore
      }

      // postgres array style: {"a","b"} ou {a,b}
      if (s.startsWith('{') && s.endsWith('}')) {
        const inside = s.slice(1, -1);
        const parts = inside
          .split(',')
          .map(t => t.trim().replace(/^"|"$/g, ''))
          .filter(Boolean);
        pushMany(parts);
        continue;
      }

      // URL “solta”
      out.push(s);
      continue;
    }

    // objeto com chaves numéricas
    if (raw && typeof raw === 'object') {
      const vals = Object.values(raw).filter(Boolean);
      if (vals.length) pushMany(vals);
    }
  }

  // garante capa se existir
  pushMany(coverCandidates);

  // remove duplicados mantendo ordem
  const uniq = [];
  const seen = new Set();
  for (const url of out) {
    if (!seen.has(url)) {
      seen.add(url);
      uniq.push(url);
    }
  }
  return uniq;
};

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

const PropertyDetails = () => {
  const { id } = useParams();
  const { properties, deleteProperty } = useProperties();
  const navigate = useNavigate();


  const [lang, setLang] = useState(localStorage.getItem('ab-user-lang') || 'pt');
  const t = (key) => translations[lang][key] || translations['pt'][key] || key;

  const [property, setProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  // define “voltar” de forma inteligente
  const authed = useMemo(() => isValidSession(), []);
  const backHref = authed ? '/properties' : '/#imoveis';

  useEffect(() => {
    const found = properties.find(p => String(p.id) === String(id));
    setProperty(found || null);
    setCurrentImageIndex(0);
  }, [id, properties]);

  const allImages = useMemo(() => normalizeImages(property), [property]);

  // garante índice válido quando mudar array
  useEffect(() => {
    if (!allImages.length) {
      setCurrentImageIndex(0);
      return;
    }
    setCurrentImageIndex((idx) => {
      const safe = Number.isFinite(idx) ? idx : 0;
      return Math.min(Math.max(safe, 0), allImages.length - 1);
    });
  }, [allImages]);

  // Bloqueia scroll do body quando galeria está aberta
  useEffect(() => {
    if (showGallery) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showGallery]);

  // Keyboard Navigation (setas + ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showGallery) setShowGallery(false);
        if (showVideoModal) setShowVideoModal(false);
        if (showDeleteModal) setShowDeleteModal(false);
        return;
      }

      if (!showGallery) return;

      const len = allImages.length;
      if (len <= 1) return;

      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(prev => (prev - 1 + len) % len);
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => (prev + 1) % len);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGallery, showVideoModal, showDeleteModal, allImages.length]);

  const youtubeId = property ? getYoutubeId(property.videoLink || property.video || property.video_url || property.video_link) : null;

  const generatePDF = () => {
    if (!property) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(22, 107, 156);
    doc.text(property.title || 'Imóvel', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    doc.text(`${t('pdf_address')}: ${property.address || 'N/D'}`, 20, 35);
    doc.text(`${t('pdf_type')}: ${property.type || 'N/D'}`, 20, 45);

    const contract =
      property.contract === 'locacao'
        ? t('filter_rent')
        : property.contract === 'ambos'
          ? t('filter_both')
          : t('filter_sale');

    doc.text(`${t('pdf_contract')}: ${contract}`, 20, 55);

    const sale = Number(property.price || property.salePrice || 0);
    const rent = Number(property.rentalPrice || 0);

    if (property.contract === 'ambos') {

      doc.text(`${t('pdf_sale_price')}: R$ ${sale.toLocaleString('pt-BR')}`, 20, 65);
      doc.text(`${t('pdf_rent_price')}: R$ ${rent.toLocaleString('pt-BR')}${t('prop_month')}`, 20, 75);
      doc.text(`${t('pdf_area')}: ${Number(property.area || 0)}m²`, 20, 85);
    } else {
      const val = Number(property.price || property.rentalPrice || 0);
      doc.text(
        `${t('pdf_price')}: R$ ${val.toLocaleString('pt-BR')}${property.contract === 'locacao' ? t('prop_month') : ''}`,
        20,
        65
      );
      doc.text(`${t('pdf_area')}: ${Number(property.area || 0)}m²`, 20, 75);
    }

    doc.text(
      `${t('prop_rooms')}: ${Number(property.rooms || 0)} | ${t('prop_baths')}: ${Number(property.bathrooms || 0)} | ${t('prop_garage')}: ${Number(property.garage || 0)}`,
      20,
      95
    );

    if (property.description) {

      doc.text(`${t('details_description')}:`, 20, 110);
      const lines = doc.splitTextToSize(String(property.description), 170);
      doc.text(lines, 20, 120);
    }

    doc.save(`${String(property.title || 'imovel').replace(/\s+/g, '_')}_Ficha.pdf`);
  };

  const handleShare = async () => {
    if (!property) return;

    const price = Number(property.price || property.rentalPrice || 0);
    const shareData = {
      title: property.title,
      text: `${property.title} - R$ ${price.toLocaleString('pt-BR')} - ${property.address || ''}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);

        // alert(t('link_copied')); // I can skip alert if it creates noise, but let's just keep it simple
      }
    } catch {
      // usuário cancelou share, ok
    }
  };

  const handleDelete = async () => {
    await deleteProperty(id);
    navigate('/properties');
  };


  const handleWhatsApp = () => {
    if (!property) return;
    const price = Number(property.price || property.rentalPrice || 0);
    const text = `Olá! Tenho interesse no imóvel: ${property.title} - R$ ${price.toLocaleString('pt-BR')}`;
    const whatsapp = localStorage.getItem('ab-whatsapp') || systemConfig.whatsappNumber;
    openWhatsApp(text, whatsapp);
  };

  const handleCall = () => {
    const whatsapp = localStorage.getItem('ab-whatsapp') || systemConfig.whatsappNumber;
    if (whatsapp) {
      window.open(`tel:+${whatsapp}`);
    } else {
      alert('Número de telefone não configurado. Vá em Configurações para definir.');
    }
  };


  if (!property) return <div className="p-10 text-center text-slate-400">{t('loading')}</div>;

  const coverSrc = allImages[currentImageIndex];

  return (
    <div className="bg-slate-50 min-h-screen pb-24 relative">
      {/* Image Gallery / Header */}
      <div className="relative h-72 bg-slate-200">
        {/* VOLTAR: público vs admin */}
        <Link
          to={backHref}
          className="absolute top-4 left-4 z-10 bg-white/80 p-2 rounded-full shadow-sm backdrop-blur"

          title={t('details_back')}
        >
          <ArrowLeft size={20} className="text-slate-800" />
        </Link>

        {allImages.length > 0 ? (
          <>
            <img
              src={coverSrc}
              alt={property.title || 'Imóvel'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowGallery(true)}
              onError={(e) => {
                // se alguma URL falhar, tenta avançar
                if (allImages.length > 1) {
                  setCurrentImageIndex((i) => (i + 1) % allImages.length);
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }}
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

          <div className="w-full h-full flex items-center justify-center text-slate-400">{t('no_images') || 'Sem imagem'}</div>
        )}
      </div>

      {/* Action buttons on image */}
      <div className="absolute top-[240px] right-4 flex gap-2 z-10">
        <button onClick={handleShare} className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">

          <Share2 size={14} /> {t('details_share')}
        </button>
        {youtubeId && (
          <button onClick={() => setShowVideoModal(true)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
            <Video size={14} /> {t('details_video')}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white -mt-6 rounded-t-3xl relative p-6 shadow-sm min-h-[500px]">
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>

        <div className="flex justify-between items-start mb-2">

          <h1 className="text-2xl font-bold text-slate-800 w-3/4 leading-tight">
            <TranslatedText lang={lang}>{property.title}</TranslatedText>
          </h1>

          {/* Só mostra ações de editar/excluir no admin */}
          {authed && (
            <div className="flex items-center gap-1">
              <Link
                to={`/properties/edit/${property.id}`}
                className="text-[var(--primary-color)] p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                title="Editar"
              >
                <Edit size={18} />
              </Link>
              <button
                onClick={generatePDF}
                className="text-[var(--primary-color)] p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                title="Gerar PDF"
              >
                <FileText size={18} />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-red-500 p-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        <p className="text-slate-500 text-sm mb-6 flex items-center gap-1">

          <MapPin size={16} className="text-[var(--primary-color)]" />
          <TranslatedText lang={lang}>{property.address}</TranslatedText>
        </p>

        {/* Badges */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${property.status === 'Disponível'
              ? 'bg-emerald-100 text-emerald-700'
              : property.status === 'Reservado'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
              }`}
          >

            <TranslatedText lang={lang}>{property.status}</TranslatedText>
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 uppercase">
            {property.contract === 'locacao' ? t('filter_rent') : property.contract === 'ambos' ? t('filter_both') : t('filter_sale')}
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

            <span className="font-bold text-slate-800 text-sm">{Number(property.rooms || 0)} <span className="text-[10px] font-normal text-slate-400">{t('prop_rooms')}</span></span>
          </div>
          <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
            <span className="text-slate-400"><Bath size={20} /></span>
            <span className="font-bold text-slate-800 text-sm">{Number(property.bathrooms || 0)} <span className="text-[10px] font-normal text-slate-400">{t('prop_baths')}</span></span>
          </div>
          <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
            <span className="text-slate-400"><Car size={20} /></span>
            <span className="font-bold text-slate-800 text-sm">{Number(property.garage || 0)} <span className="text-[10px] font-normal text-slate-400">{t('prop_garage')}</span></span>
          </div>
          <div className="min-w-[80px] p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-1">
            <span className="text-slate-400 font-serif font-bold text-lg">M²</span>
            <span className="font-bold text-slate-800 text-sm">{Number(property.area || 0)} <span className="text-[10px] font-normal text-slate-400">{t('prop_area')}</span></span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">

          <h3 className="font-bold text-slate-800 mb-2">{t('details_description')}</h3>
          <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">
            <TranslatedText lang={lang}>
              {property.description ||
                `Este imóvel incrível localizado em ${String(property.address || '').split('-')[1] || 'João Pessoa - PB'} oferece todo o conforto e exclusividade. Com acabamento de alto padrão e localização privilegiada.`}
            </TranslatedText>
          </p>
        </div>

        {/* YouTube Video Embed */}
        {youtubeId && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">

              <Video size={18} className="text-red-500" /> {t('details_video_title')}
            </h3>
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

          <h3 className="font-bold text-slate-800 mb-2">{t('details_location')}</h3>
          <div className="h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-200">
            📍 {property.address}
          </div>
        </div>
      </div>

      {/* Floating Price & CTA */}
      <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 z-20">
        <div>
          {property.contract === 'ambos' ? (

            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{t('filter_both')}</p>
              <PriceDisplay
                brlValue={property.price || property.salePrice}
                lang={lang}
                propertyConsultText={t('property_consult')}
              />
              <PriceDisplay
                brlValue={property.rentalPrice}
                lang={lang}
                propertyConsultText=""
                isRent={true}
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{t('details_total_value')}</p>
              <PriceDisplay
                brlValue={property.contract === 'locacao' ? property.rentalPrice : (property.price || property.salePrice)}
                lang={lang}
                propertyConsultText={t('property_consult')}
                isRent={property.contract === 'locacao'}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleWhatsApp}
            className="bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-[#128C7E] transition-all flex items-center gap-2 group"
          >
            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />

            {t('details_whatsapp')}
          </button>
          <button
            onClick={handleCall}
            className="bg-[var(--primary-color)] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[var(--primary-dark)] transition-colors flex items-center gap-2"
          >

            <Phone size={18} /> {t('details_call')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>

            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('details_delete_title')}</h3>
            <p className="text-sm text-slate-500 mb-6">{t('details_delete_confirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 rounded-xl font-bold text-slate-500 border border-slate-200 hover:bg-slate-50">
                {t('details_cancel')}
              </button>
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
                {t('details_delete_button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black z-50 overflow-hidden" style={{ height: '100dvh' }}>
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
            <span className="text-white font-bold">{currentImageIndex + 1} / {allImages.length}</span>
            <button onClick={() => setShowGallery(false)} className="text-white p-2" title="Fechar (ESC)">
              <X size={24} />
            </button>
          </div>
          {/* Image area */}
          <div
            className="absolute left-0 right-0 bottom-0 overflow-hidden"
            style={{ top: '56px' }}
          >
            <img
              src={allImages[currentImageIndex]}
              alt=""
              className="block w-full h-full object-contain"
            />
          </div>
          {/* Navigation arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur p-3 rounded-full text-white z-10"
                title="Anterior (←)"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setCurrentImageIndex(i => (i + 1) % allImages.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur p-3 rounded-full text-white z-10"
                title="Próxima (→)"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && youtubeId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowVideoModal(false)}>
          <div className="w-full max-w-3xl aspect-video relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowVideoModal(false)} className="absolute -top-10 right-0 text-white" title="Fechar (ESC)">
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
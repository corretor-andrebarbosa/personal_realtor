import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PencilRuler, LockKeyhole, LockOpen, X, Loader2, CheckCircle2, ExternalLink, MessageCircle } from 'lucide-react';

import { requestFloorPlan, fetchFloorPlanUrl } from '../lib/floorPlan';
import {
  cleanName,
  isValidName,
  isValidEmail,
  normalizePhone,
  toOpenableUrl,
  errorKeyFor,
  readUnlockedFloorPlan,
  rememberUnlockedFloorPlan,
} from '../lib/floorPlanUtils';
import { openWhatsApp } from '../whatsapp';
import { trackAdsConversion } from '../lib/adsConversions';

// localStorage pode não existir (aba anônima em alguns navegadores)
const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// Campo do formulário ligado a cada código de erro devolvido pelo banco
const FIELD_FOR_ERROR = {
  invalid_name: 'name',
  invalid_phone: 'phone',
  invalid_email: 'email',
  consent_required: 'consent',
};

const EMPTY_FORM = { name: '', phone: '', email: '', consent: false, trap: '' };

const inputClass = (invalid) =>
  `w-full p-3 bg-slate-50 border rounded-xl text-sm outline-none transition-colors focus:border-[var(--primary-color)] ${
    invalid ? 'border-red-300' : 'border-slate-200'
  }`;

/**
 * Planta baixa do imóvel, liberada só depois que o visitante deixa o contato.
 *
 * - Visitante: vê o cartão trancado → preenche nome/WhatsApp → o banco grava o lead
 *   (aba Leads do painel) e devolve o link → a planta abre em nova aba.
 * - Quem já preencheu neste aparelho: o cartão abre direto (lembrança local de 7 dias).
 * - Admin logado: abre direto, sem formulário.
 *
 * O link nunca vem junto com os dados públicos do imóvel; `property.has_floor_plan`
 * só diz se existe planta. Ver src/lib/floorPlan.js.
 */
const FloorPlanAccess = ({ property, lang = 'pt', t, authed = false }) => {
  const propertyId = property?.id;
  const hasFloorPlan = property?.has_floor_plan === true;

  const [adminUrl, setAdminUrl] = useState('');
  const [unlockedUrl, setUnlockedUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorKey, setErrorKey] = useState('');
  const [errorField, setErrorField] = useState('');

  const mounted = useRef(true);
  const nameInputRef = useRef(null);
  // Trava contra envio em dobro. É ref (e não estado) porque precisa valer já no mesmo
  // instante do primeiro envio, antes de a tela ser redesenhada.
  const sendingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Troca de imóvel: zera o estado e recupera o que já foi liberado neste aparelho
  useEffect(() => {
    setIsOpen(false);
    setForm(EMPTY_FORM);
    setStatus('idle');
    setErrorKey('');
    setErrorField('');
    setUnlockedUrl(readUnlockedFloorPlan(safeStorage(), propertyId));
  }, [propertyId]);

  // Admin logado lê o link direto da tabela (o visitante recebe vazio por causa do RLS)
  useEffect(() => {
    let cancelled = false;
    setAdminUrl('');
    if (!authed || propertyId == null) return undefined;
    fetchFloorPlanUrl(propertyId).then(({ url }) => {
      if (!cancelled) setAdminUrl(toOpenableUrl(url));
    });
    return () => { cancelled = true; };
  }, [authed, propertyId]);

  // Com o formulário aberto: trava a rolagem da página e fecha no ESC. No computador
  // já foca o nome; no celular não, para o teclado não cobrir o formulário antes da hora.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    if (window.matchMedia?.('(pointer: fine)').matches) nameInputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!property || (!hasFloorPlan && !adminUrl)) return null;

  const directUrl = adminUrl || unlockedUrl;
  const propertyLabel = property.slug || String(propertyId);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorField === field) {
      setErrorField('');
      setErrorKey('');
    }
  };

  const fail = (field, key) => {
    setStatus('error');
    setErrorField(field);
    setErrorKey(key);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sendingRef.current) return;

    const name = cleanName(form.name);
    if (!isValidName(name)) return fail('name', 'fp_err_name');

    // Em português presume número brasileiro; nos outros idiomas pede o código do país.
    const phone = normalizePhone(form.phone, { requireCountryCode: lang !== 'pt' });
    if (!phone.valid) return fail('phone', 'fp_err_phone');

    if (!isValidEmail(form.email)) return fail('email', 'fp_err_email');
    if (!form.consent) return fail('consent', 'fp_err_consent');

    // Campo-isca preenchido = robô. Não chama o banco.
    if (form.trap) return fail('', 'fp_err_generic');

    sendingRef.current = true;
    setStatus('sending');
    setErrorKey('');
    setErrorField('');

    // A aba é aberta já, ainda dentro do clique: Safari e outros navegadores bloqueiam
    // window.open feito depois de uma espera de rede. Ela recebe o endereço da planta
    // quando o banco responder. Se o navegador não abrir, fica o botão na tela de sucesso.
    let tab = null;
    try {
      tab = window.open('', '_blank');
      if (tab) {
        tab.document.title = t('fp_title');
        tab.document.body.style.cssText = 'font-family:system-ui,sans-serif;padding:24px;color:#475569';
        tab.document.body.textContent = t('fp_sending');
      }
    } catch {
      /* sem aba prévia: segue pelo botão da tela de sucesso */
    }

    const result = await requestFloorPlan({
      propertyId,
      name,
      phone: `+${phone.digits}`,
      email: form.email.trim(),
      consent: true,
      lang,
    });
    sendingRef.current = false;

    if (result.ok) {
      try {
        if (tab && !tab.closed) {
          tab.opener = null;
          tab.location.replace(result.url);
        }
      } catch {
        /* o botão "abrir" da tela de sucesso cobre este caso */
      }
      rememberUnlockedFloorPlan(safeStorage(), propertyId, result.url);
      trackAdsConversion('form', propertyLabel);
      if (!mounted.current) return;
      setUnlockedUrl(result.url);
      setStatus('success');
      return;
    }

    try {
      if (tab && !tab.closed) tab.close();
    } catch {
      /* nada a fazer */
    }
    if (!mounted.current) return;
    fail(FIELD_FOR_ERROR[result.error] || '', errorKeyFor(result.error));
  };

  const handleWhatsApp = () => {
    trackAdsConversion('whatsapp', propertyLabel);
    openWhatsApp(`${t('fp_whatsapp_message')}: ${property.title || ''}`.trim());
  };

  const sending = status === 'sending';

  return (
    <div className="mb-8" data-testid="floor-plan">
      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <PencilRuler size={18} className="text-[var(--primary-color)]" />
        {t('fp_title')}
      </h3>

      {directUrl ? (
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="floor-plan-open"
          className="flex items-center gap-4 w-full p-5 rounded-2xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white hover:border-blue-300 hover:from-blue-100 transition-all group shadow-sm"
        >
          <div className="w-14 h-14 rounded-xl bg-[var(--primary-color)] flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <LockOpen size={28} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-base leading-tight">{t('fp_title')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{adminUrl ? t('fp_admin_hint') : t('fp_unlocked_hint')}</p>
            <p className="text-xs text-[var(--primary-color)] font-semibold mt-1">{t('fp_unlocked_cta')}</p>
          </div>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          data-testid="floor-plan-request"
          className="flex items-center gap-4 w-full p-5 rounded-2xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white hover:border-blue-300 hover:from-blue-100 transition-all group shadow-sm text-left"
        >
          <div className="w-14 h-14 rounded-xl bg-[var(--primary-color)] flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <LockKeyhole size={28} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-base leading-tight">{t('fp_title')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('fp_locked_hint')}</p>
            <p className="text-xs text-[var(--primary-color)] font-semibold mt-1">{t('fp_locked_cta')}</p>
          </div>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fp-modal-title"
            data-testid="floor-plan-modal"
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h3 id="fp-modal-title" className="text-lg font-bold text-slate-800 leading-tight">
                  {status === 'success' ? t('fp_success_title') : t('fp_modal_title')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {status === 'success' ? t('fp_success_text') : t('fp_modal_subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 shrink-0"
                title={t('fp_close')}
                aria-label={t('fp_close')}
              >
                <X size={20} />
              </button>
            </div>

            {status === 'success' ? (
              <div data-testid="floor-plan-success">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={30} />
                </div>
                <a
                  href={unlockedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="floor-plan-success-open"
                  className="w-full py-3 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[var(--primary-dark)] transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} /> {t('fp_success_open')}
                </a>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="w-full mt-3 py-3 bg-[#25D366] text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} /> {t('fp_success_whatsapp')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-3" data-testid="floor-plan-form">
                <div>
                  <label htmlFor="fp-name" className="block text-xs font-bold text-slate-500 mb-1">{t('fp_name_label')} *</label>
                  <input
                    id="fp-name"
                    ref={nameInputRef}
                    type="text"
                    name="name"
                    autoComplete="name"
                    maxLength={80}
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    aria-invalid={errorField === 'name'}
                    className={inputClass(errorField === 'name')}
                    placeholder={t('fp_name_placeholder')}
                  />
                </div>

                <div>
                  <label htmlFor="fp-phone" className="block text-xs font-bold text-slate-500 mb-1">{t('fp_phone_label')} *</label>
                  <input
                    id="fp-phone"
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={24}
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    aria-invalid={errorField === 'phone'}
                    className={inputClass(errorField === 'phone')}
                    placeholder={t('fp_phone_placeholder')}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('fp_phone_hint')}</p>
                </div>

                <div>
                  <label htmlFor="fp-email" className="block text-xs font-bold text-slate-500 mb-1">{t('fp_email_label')}</label>
                  <input
                    id="fp-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    maxLength={120}
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    aria-invalid={errorField === 'email'}
                    className={inputClass(errorField === 'email')}
                    placeholder={t('fp_email_placeholder')}
                  />
                </div>

                {/* Campo-isca para robôs: fora da tela e fora da navegação por teclado */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label htmlFor="fp-hp">Não preencha este campo</label>
                  <input
                    id="fp-hp"
                    type="text"
                    name="fp_hp"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.trap}
                    onChange={(e) => setField('trap', e.target.value)}
                  />
                </div>

                <label
                  className={`flex items-start gap-2 text-xs cursor-pointer select-none ${
                    errorField === 'consent' ? 'text-red-600' : 'text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="consent"
                    checked={form.consent}
                    onChange={(e) => setField('consent', e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--primary-color)]"
                  />
                  <span>
                    {t('fp_consent_text')}{' '}
                    <Link
                      to="/politica-de-privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[var(--primary-color)]"
                    >
                      {t('fp_consent_link')}
                    </Link>
                    .
                  </span>
                </label>

                {status === 'error' && errorKey && (
                  <p role="alert" data-testid="floor-plan-error" className="text-xs font-medium text-red-600">
                    {t(errorKey)}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  data-testid="floor-plan-submit"
                  className={`w-full py-3 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 ${
                    sending ? 'bg-slate-400 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:bg-[var(--primary-dark)]'
                  }`}
                >
                  {sending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> {t('fp_sending')}
                    </>
                  ) : (
                    <>
                      <LockOpen size={18} /> {t('fp_submit')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanAccess;

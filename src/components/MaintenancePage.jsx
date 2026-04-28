import React, { useState, useEffect } from 'react';

// Traduções estáticas — sem dependência de API externa
const TRANSLATIONS = {
  pt: {
    welcome: 'Bem-vindo(a)!',
    message: 'Estamos em manutenção para melhor lhe atender.',
    returning: 'Estaremos de volta em',
    please: 'Por favor, volte novamente mais tarde.',
    thanks: 'Obrigado pela compreensão.',
    and: 'e',
    day: 'dia', days: 'dias',
    hour: 'hora', hours: 'horas',
    minute: 'minuto', minutes: 'minutos',
    second: 'segundo', seconds: 'segundos',
    labelHours: 'Horas', labelMin: 'Min', labelSeg: 'Seg',
    labelDay: 'Dia', labelDays: 'Dias',
  },
  en: {
    welcome: 'Welcome!',
    message: 'We are under maintenance to better serve you.',
    returning: 'We will be back in',
    please: 'Please come back later.',
    thanks: 'Thank you for your understanding.',
    and: 'and',
    day: 'day', days: 'days',
    hour: 'hour', hours: 'hours',
    minute: 'minute', minutes: 'minutes',
    second: 'second', seconds: 'seconds',
    labelHours: 'Hours', labelMin: 'Min', labelSeg: 'Sec',
    labelDay: 'Day', labelDays: 'Days',
  },
  es: {
    welcome: '¡Bienvenido(a)!',
    message: 'Estamos en mantenimiento para atenderle mejor.',
    returning: 'Estaremos de vuelta en',
    please: 'Por favor, vuelva más tarde.',
    thanks: 'Gracias por su comprensión.',
    and: 'y',
    day: 'día', days: 'días',
    hour: 'hora', hours: 'horas',
    minute: 'minuto', minutes: 'minutos',
    second: 'segundo', seconds: 'segundos',
    labelHours: 'Horas', labelMin: 'Min', labelSeg: 'Seg',
    labelDay: 'Día', labelDays: 'Días',
  },
  de: {
    welcome: 'Willkommen!',
    message: 'Wir führen Wartungsarbeiten durch, um Sie besser bedienen zu können.',
    returning: 'Wir sind zurück in',
    please: 'Bitte kommen Sie später wieder.',
    thanks: 'Vielen Dank für Ihr Verständnis.',
    and: 'und',
    day: 'Tag', days: 'Tage',
    hour: 'Stunde', hours: 'Stunden',
    minute: 'Minute', minutes: 'Minuten',
    second: 'Sekunde', seconds: 'Sekunden',
    labelHours: 'Std', labelMin: 'Min', labelSeg: 'Sek',
    labelDay: 'Tag', labelDays: 'Tage',
  },
};

const SUPPORTED = Object.keys(TRANSLATIONS);

// Mesma lógica de detecção de idioma usada em Home.jsx
async function detectLanguage() {
  // 1) Idioma salvo manualmente pelo usuário
  const saved = localStorage.getItem('ab-user-lang');
  if (saved && TRANSLATIONS[saved]) return saved;

  // 2) Idioma do navegador
  const browserLang = navigator.language.split('-')[0];
  if (TRANSLATIONS[browserLang]) return browserLang;

  // 3) Geolocalização por IP (mesmo endpoint de Home.jsx)
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data.country_code !== 'BR' && browserLang !== 'pt') return 'en';
  } catch (_) { /* sem internet: mantém português */ }

  return 'pt';
}

function calcCountdown(endsAt) {
  const diff = endsAt - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function formatCountdown(c, tr) {
  const parts = [];
  if (c.days > 0)  parts.push(`${c.days} ${c.days === 1 ? tr.day : tr.days}`);
  if (c.hours > 0) parts.push(`${c.hours} ${c.hours === 1 ? tr.hour : tr.hours}`);
  if (c.minutes > 0 || parts.length === 0) {
    parts.push(`${c.minutes} ${c.minutes === 1 ? tr.minute : tr.minutes}`);
  }
  parts.push(`${c.seconds} ${c.seconds === 1 ? tr.second : tr.seconds}`);

  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ` ${tr.and} ` + parts[parts.length - 1];
}

const MaintenancePage = ({ endsAt }) => {
  const [lang, setLang] = useState('pt');
  const [countdown, setCountdown] = useState(() => calcCountdown(endsAt));

  // Detecta idioma uma vez ao montar
  useEffect(() => {
    detectLanguage().then(setLang);
  }, []);

  // Contador regressivo atualizado a cada segundo
  useEffect(() => {
    const interval = setInterval(() => setCountdown(calcCountdown(endsAt)), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const tr = TRANSLATIONS[lang] || TRANSLATIONS.pt;
  const countdownText = countdown ? formatCountdown(countdown, tr) : '...';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      {/* Logo */}
      <img
        src="/newlogo.png"
        alt="André Barbosa Imóveis"
        className="h-16 mb-10 object-contain"
      />

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full p-8 text-center">
        <h1 className="text-xl font-bold text-slate-800 mb-3">{tr.welcome}</h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          {tr.message}{' '}
          <span className="font-semibold text-slate-700">
            {tr.returning}{' '}
            <span className="text-[var(--primary-color)]">{countdownText}</span>.
          </span>
          <br /><br />
          {tr.please}
          <br />
          {tr.thanks}
        </p>

        {/* Blocos visuais do contador */}
        <div className="bg-slate-100 rounded-xl p-4 flex justify-center gap-4 text-center">
          {countdown && countdown.days > 0 && (
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {String(countdown.days).padStart(2, '0')}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                {countdown.days === 1 ? tr.labelDay : tr.labelDays}
              </p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {String(countdown ? countdown.hours : 0).padStart(2, '0')}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
              {tr.labelHours}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {String(countdown ? countdown.minutes : 0).padStart(2, '0')}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
              {tr.labelMin}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--primary-color)]">
              {String(countdown ? countdown.seconds : 0).padStart(2, '0')}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
              {tr.labelSeg}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;

import React, { useState, useEffect } from 'react';

function calcCountdown(endsAt) {
  const diff = endsAt - Date.now();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function formatCountdown({ days, hours, minutes, seconds }) {
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  if (seconds >= 0) parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);

  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1];
}

const MaintenancePage = ({ endsAt }) => {
  const [countdown, setCountdown] = useState(() => calcCountdown(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calcCountdown(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const countdownText = countdown ? formatCountdown(countdown) : 'em breve';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      {/* Logo */}
      <img
        src="/newlogo.png"
        alt="André Barbosa Imóveis"
        className="h-16 mb-10 object-contain"
      />

      {/* Card principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full p-8 text-center">
        <h1 className="text-xl font-bold text-slate-800 mb-3">
          Bem-vindo(a)!
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          Estamos em manutenção para melhor lhe atender.{' '}
          <span className="font-semibold text-slate-700">
            Estaremos de volta em{' '}
            <span className="text-[var(--primary-color)]">{countdownText}</span>.
          </span>
          <br /><br />
          Por favor, volte novamente mais tarde.
          <br />
          Obrigado pela compreensão.
        </p>

        {/* Blocos do contador */}
        <div className="bg-slate-100 rounded-xl p-4 flex justify-center gap-4 text-center">
          {countdown && countdown.days > 0 && (
            <div>
              <p className="text-2xl font-bold text-slate-800">{String(countdown.days).padStart(2, '0')}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                {countdown.days === 1 ? 'Dia' : 'Dias'}
              </p>
            </div>
          )}
          <div>
            <p className="text-2xl font-bold text-slate-800">{String(countdown ? countdown.hours : 0).padStart(2, '0')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Horas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{String(countdown ? countdown.minutes : 0).padStart(2, '0')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Min</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--primary-color)]">{String(countdown ? countdown.seconds : 0).padStart(2, '0')}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">Seg</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;

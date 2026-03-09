
import React, { useState, useEffect } from 'react';
import { Clock, Hammer, AlertTriangle } from 'lucide-react';
import { systemConfig } from '../../system-config';

// ─── Modo Dia Apartado ────────────────────────────────────────────────────────

const SetApartDayView = ({ endTimeMs }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const iv = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(iv);
    }, []);

    const msLeft = Math.max(0, endTimeMs - now);
    const totalMinutes = Math.floor(msLeft / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-2xl w-full border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 w-full left-0 h-2 bg-[var(--primary-color)]"></div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 mt-4">
                    Estamos em Manutenção
                </h1>

                <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                    Estamos realizando atualizações para melhorar sua experiência.
                    Voltaremos em breve!
                </p>

                {msLeft > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <div className="flex items-center justify-center gap-2 mb-4 text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <Clock size={16} /> Previsão de retorno
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-4">
                            <div className="flex flex-col items-center mx-4">
                                <span className="text-3xl md:text-5xl font-bold text-slate-800 tabular-nums">
                                    {String(hours).padStart(2, '0')}
                                </span>
                                <span className="text-xs uppercase tracking-widest text-slate-500 mt-1">horas</span>
                            </div>
                            <div className="flex flex-col items-center mx-4">
                                <span className="text-3xl md:text-5xl font-bold text-slate-800 tabular-nums">
                                    {String(minutes).padStart(2, '0')}
                                </span>
                                <span className="text-xs uppercase tracking-widest text-slate-500 mt-1">minutos</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-10 text-sm text-slate-400 flex items-center justify-center gap-2">
                    <AlertTriangle size={14} />
                    <span>Equipe Técnica {systemConfig.brokerName}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Modo Manutenção Regular ──────────────────────────────────────────────────

const Maintenance = ({ expectedReturnDate, setApartDay }) => {
    // Modo dia apartado
    if (setApartDay && setApartDay.isSetApartDay) {
        return <SetApartDayView endTimeMs={setApartDay.endTimeMs} />;
    }

    // Modo manutenção regular
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        if (!expectedReturnDate) return null;
        const difference = +new Date(expectedReturnDate) - +new Date();
        if (difference <= 0) return {};
        return {
            dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
            horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutos: Math.floor((difference / 1000 / 60) % 60),
            segundos: Math.floor((difference / 1000) % 60),
        };
    }

    useEffect(() => {
        const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearTimeout(timer);
    });

    const timerComponents = [];
    if (timeLeft) {
        Object.keys(timeLeft).forEach((interval) => {
            if (!timeLeft[interval] && timeLeft[interval] !== 0) return;
            timerComponents.push(
                <div key={interval} className="flex flex-col items-center mx-1 md:mx-4">
                    <span className="text-3xl md:text-5xl font-bold text-slate-800 tabular-nums">
                        {String(timeLeft[interval]).padStart(2, '0')}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-slate-500 mt-1">{interval}</span>
                </div>
            );
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-2xl w-full border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 w-full left-0 h-2 bg-[var(--primary-color)]"></div>

                <div className="mb-8 flex justify-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 animate-pulse">
                        <Hammer size={40} />
                    </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">
                    Estamos em Manutenção
                </h1>

                <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                    Estamos realizando atualizações para melhorar sua experiência.
                    Voltaremos em breve com novidades incríveis!
                </p>

                {expectedReturnDate && timerComponents.length ? (
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <div className="flex items-center justify-center gap-2 mb-4 text-slate-500 text-sm font-medium uppercase tracking-wider">
                            <Clock size={16} /> Previsão de retorno
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-0">
                            {timerComponents}
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-400 italic">Por favor, retorne mais tarde.</div>
                )}

                <div className="mt-10 text-sm text-slate-400 flex items-center justify-center gap-2">
                    <AlertTriangle size={14} />
                    <span>Equipe Técnica {systemConfig.brokerName}</span>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;

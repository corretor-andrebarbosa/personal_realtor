import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LITORAL_IMG = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=85&w=1200';
const CAMPO_IMG   = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=85&w=1200';

export default function PortalEntrada() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen flex flex-col md:flex-row font-[Manrope] overflow-hidden">

            {/* ═══ Metade esquerda — Litoral ═══ */}
            <div
                onClick={() => navigate('/litoral')}
                className="flex-1 relative cursor-pointer group overflow-hidden min-h-[50vh] md:min-h-screen"
            >
                <img
                    src={LITORAL_IMG}
                    alt="Litoral e cidade"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-blue-950/50 group-hover:bg-blue-950/40 transition-colors duration-300" />
            </div>

            {/* ═══ Metade direita — Campo ═══ */}
            <div
                onClick={() => navigate('/campo')}
                className="flex-1 relative cursor-pointer group overflow-hidden min-h-[50vh] md:min-h-screen"
            >
                <img
                    src={CAMPO_IMG}
                    alt="Campo e interior"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-emerald-950/50 group-hover:bg-emerald-950/40 transition-colors duration-300" />
            </div>

            {/* ═══ Overlay central — texto + botões ═══ */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-6">

                {/* Logo */}
                <img
                    src="/newlogo2.png"
                    alt="André Barbosa Imóveis"
                    className="h-10 object-contain drop-shadow-lg mb-10"
                    onError={e => { e.target.style.display = 'none'; }}
                />

                <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-xl tracking-tight mb-3 text-center">
                    Bem-vindo(a)!
                </h1>
                <p className="text-lg md:text-xl text-white/75 font-light mb-12 text-center tracking-wide">
                    O que você deseja?
                </p>

                {/* Botões — pointer-events ativados */}
                <div className="flex flex-col sm:flex-row gap-4 pointer-events-auto">
                    <button
                        onClick={() => navigate('/litoral')}
                        className="px-10 py-4 bg-white text-slate-800 font-bold rounded-full text-base md:text-lg shadow-2xl hover:bg-blue-50 hover:scale-105 transition-all duration-200 flex items-center gap-3"
                    >
                        🌊 Litoral e cidade
                    </button>
                    <button
                        onClick={() => navigate('/campo')}
                        className="px-10 py-4 bg-white/15 backdrop-blur border-2 border-white/50 text-white font-bold rounded-full text-base md:text-lg shadow-2xl hover:bg-white hover:text-slate-800 hover:scale-105 transition-all duration-200 flex items-center gap-3"
                    >
                        🌳 Campo e interior
                    </button>
                </div>
            </div>

            {/* Divisor vertical sutil (desktop) */}
            <div className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-white/20 z-10 pointer-events-none" />

            {/* Link discreto — área do corretor */}
            <Link
                to="/login"
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 text-white/30 text-xs hover:text-white/60 transition-colors whitespace-nowrap"
            >
                Área do corretor
            </Link>
        </div>
    );
}

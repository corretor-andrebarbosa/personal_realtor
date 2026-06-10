import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LITORAL_IMG = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1400';
const CAMPO_IMG   = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1400';

export default function PortalEntrada() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col md:flex-row font-[Manrope] overflow-hidden relative">

            {/* Logo centralizado no topo */}
            <div className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center pt-7 pb-3 pointer-events-none">
                <img
                    src="/newlogo2.png"
                    alt="André Barbosa Imóveis"
                    className="h-11 object-contain drop-shadow-lg"
                    onError={e => { e.target.style.display = 'none'; }}
                />
                <p className="text-white/70 text-xs font-semibold mt-2 tracking-widest uppercase drop-shadow">
                    O que você está procurando?
                </p>
            </div>

            {/* ═══ LITORAL & CIDADE ═══ */}
            <div
                onClick={() => navigate('/litoral')}
                className="flex-1 relative cursor-pointer group overflow-hidden min-h-[50vh] md:min-h-screen flex items-end justify-center"
                role="button"
                aria-label="Litoral e Cidade"
            >
                <img
                    src={LITORAL_IMG}
                    alt="Litoral e Cidade"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* overlay gradiente azul */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-900/40 to-blue-900/10 transition-opacity duration-300 group-hover:from-blue-950/95" />

                <div className="relative z-10 flex flex-col items-center text-white text-center px-8 pb-16 md:pb-24">
                    <span className="text-6xl md:text-7xl mb-5 drop-shadow-xl select-none leading-none">🌊</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg tracking-tight">
                        Litoral & Cidade
                    </h2>
                    <p className="text-white/70 text-sm md:text-base max-w-xs leading-relaxed mb-7">
                        Apartamentos, coberturas e casas em João Pessoa
                    </p>
                    <span className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-900 font-bold rounded-full shadow-2xl group-hover:bg-blue-50 transition-all text-sm md:text-base tracking-wide">
                        Explorar imóveis →
                    </span>
                </div>
            </div>

            {/* Divisor vertical (desktop) / horizontal (mobile) */}
            <div className="hidden md:block absolute inset-y-0 left-1/2 w-[2px] bg-white/20 z-20 pointer-events-none" />
            <div className="md:hidden h-[2px] bg-white/20 z-20" />

            {/* ═══ CAMPO & INTERIOR ═══ */}
            <div
                onClick={() => navigate('/campo')}
                className="flex-1 relative cursor-pointer group overflow-hidden min-h-[50vh] md:min-h-screen flex items-end justify-center"
                role="button"
                aria-label="Campo e Interior"
            >
                <img
                    src={CAMPO_IMG}
                    alt="Campo e Interior"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* overlay gradiente verde */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-900/40 to-emerald-900/10 transition-opacity duration-300 group-hover:from-emerald-950/95" />

                <div className="relative z-10 flex flex-col items-center text-white text-center px-8 pb-16 md:pb-24">
                    <span className="text-6xl md:text-7xl mb-5 drop-shadow-xl select-none leading-none">🌳</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-3 drop-shadow-lg tracking-tight">
                        Campo & Interior
                    </h2>
                    <p className="text-white/70 text-sm md:text-base max-w-xs leading-relaxed mb-7">
                        Chácaras, sítios e fazendas no interior da Paraíba
                    </p>
                    <span className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-900 font-bold rounded-full shadow-2xl group-hover:bg-emerald-50 transition-all text-sm md:text-base tracking-wide">
                        Explorar imóveis →
                    </span>
                </div>
            </div>

            {/* Link discreto para área do corretor */}
            <Link
                to="/login"
                onClick={e => e.stopPropagation()}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 text-white/30 text-xs hover:text-white/60 transition-colors whitespace-nowrap"
            >
                Área do corretor
            </Link>
        </div>
    );
}

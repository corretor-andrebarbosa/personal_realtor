import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

const BG = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=85&w=1920';

export default function PortalEntrada() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center font-[Manrope] overflow-hidden">

            {/* Background */}
            <img
                src={BG}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay escuro suave */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Logo */}
            <div className="absolute top-7 left-1/2 -translate-x-1/2 z-20">
                <img
                    src="/newlogo2.png"
                    alt="André Barbosa Imóveis"
                    className="h-10 object-contain drop-shadow-lg"
                    onError={e => { e.target.style.display = 'none'; }}
                />
            </div>

            {/* Conteúdo central */}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg tracking-tight">
                    Bem-vindo(a)!
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-12 font-light tracking-wide">
                    O que você deseja?
                </p>

                {/* Botões */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => navigate('/litoral')}
                        className="px-10 py-4 bg-white text-slate-800 font-bold rounded-full text-base md:text-lg shadow-2xl hover:bg-slate-100 hover:scale-105 transition-all duration-200 flex items-center gap-3"
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

            {/* Link discreto para área do corretor */}
            <Link
                to="/login"
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 text-white/30 text-xs hover:text-white/60 transition-colors"
            >
                Área do corretor
            </Link>
        </div>
    );
}

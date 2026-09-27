import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const VIDEO_ID = 'vjjaYoTLVnA';
const DEST     = '/portal';

export default function IntroVideo() {
    const navigate   = useNavigate();
    const iframeRef  = useRef(null);
    const [showSkip, setShowSkip] = useState(false);
    const [muted, setMuted]       = useState(true);

    // Já assistiu nesta sessão → pula direto pro portal
    if (sessionStorage.getItem('intro-seen')) {
        return <Navigate to={DEST} replace />;
    }

    const goToPortal = () => {
        sessionStorage.setItem('intro-seen', '1');
        navigate(DEST, { replace: true });
    };

    const handleUnmute = () => {
        iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*'
        );
        setMuted(false);
    };

    useEffect(() => {
        const skipTimer = setTimeout(() => setShowSkip(true), 3000);
        const fallback  = setTimeout(goToPortal, 180000); // segurança: 3 min

        // Detecta fim do vídeo via postMessage do YouTube (enablejsapi=1)
        const handleMessage = (e) => {
            if (e.origin !== 'https://www.youtube.com') return;
            try {
                const data = JSON.parse(e.data);
                // playerState 0 = ENDED
                if (data.event === 'infoDelivery' && data.info?.playerState === 0) {
                    clearTimeout(fallback);
                    goToPortal();
                }
            } catch {}
        };

        window.addEventListener('message', handleMessage);

        return () => {
            clearTimeout(skipTimer);
            clearTimeout(fallback);
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const src = [
        `https://www.youtube.com/embed/${VIDEO_ID}`,
        `?autoplay=1&mute=1&controls=0&rel=0`,
        `&modestbranding=1&playsinline=1`,
        `&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
    ].join('');

    return (
        <div className="fixed inset-0 bg-black font-[Manrope] overflow-hidden">

            {/*
             * Cover responsivo:
             * - largura mínima = 100vw; se a tela for mais alta que 16:9, aumenta a largura
             * - altura mínima = 100vh; se a tela for mais larga que 16:9, aumenta a altura
             * O vídeo sempre cobre tudo, sem barras pretas, centralizado.
             */}
            <iframe
                ref={iframeRef}
                src={src}
                allow="autoplay; encrypted-media"
                title="Introdução"
                style={{
                    position:  'absolute',
                    top:       '50%',
                    left:      '50%',
                    transform: 'translate(-50%, -50%)',
                    width:     'max(100vw, calc(100vh * 16 / 9))',
                    height:    'max(100vh, calc(100vw * 9 / 16))',
                    border:    'none',
                    pointerEvents: 'none',
                }}
            />

            {/* Ativar som — canto inferior esquerdo */}
            {muted && (
                <button
                    onClick={handleUnmute}
                    className="absolute bottom-6 left-5 z-10 flex items-center gap-2 px-4 py-2.5 bg-black/50 backdrop-blur border border-white/25 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all"
                >
                    🔇 Clique para ouvir
                </button>
            )}

            {/* Pular — aparece após 3 s, canto inferior direito */}
            {showSkip && (
                <button
                    onClick={goToPortal}
                    className="absolute bottom-6 right-5 z-10 px-5 py-2.5 bg-black/40 backdrop-blur border border-white/25 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all"
                >
                    Pular introdução →
                </button>
            )}
        </div>
    );
}

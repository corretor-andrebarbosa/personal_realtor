import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const VIDEO_ID = 'vjjaYoTLVnA';
const DEST     = '/portal';

export default function IntroVideo() {
    const navigate    = useNavigate();
    const playerRef   = useRef(null);
    const [showSkip, setShowSkip] = useState(false);
    const [muted, setMuted]       = useState(true);

    // Já assistiu nessa sessão → vai direto pro portal
    if (sessionStorage.getItem('intro-seen')) {
        return <Navigate to={DEST} replace />;
    }

    const goToPortal = () => {
        sessionStorage.setItem('intro-seen', '1');
        navigate(DEST, { replace: true });
    };

    useEffect(() => {
        const skipTimer = setTimeout(() => setShowSkip(true), 3000);
        const fallback  = setTimeout(goToPortal, 180000); // segurança: 3 min máx

        function createPlayer() {
            if (playerRef.current) return;
            playerRef.current = new window.YT.Player('yt-intro-player', {
                videoId: VIDEO_ID,
                playerVars: {
                    autoplay:       1,
                    mute:           1, // mudo para compatibilidade com autoplay
                    controls:       0,
                    rel:            0,
                    modestbranding: 1,
                    playsinline:    1,
                    fs:             0,
                    disablekb:      1,
                    origin:         window.location.origin,
                },
                events: {
                    onReady: (e) => e.target.playVideo(),
                    onStateChange: (e) => {
                        if (e.data === 0) { // YT.PlayerState.ENDED
                            clearTimeout(fallback);
                            goToPortal();
                        }
                    },
                    onError: () => { clearTimeout(fallback); goToPortal(); },
                },
            });
        }

        if (window.YT?.Player) {
            createPlayer();
        } else {
            window.onYouTubeIframeAPIReady = createPlayer;
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const tag = document.createElement('script');
                tag.src   = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
        }

        return () => {
            clearTimeout(skipTimer);
            clearTimeout(fallback);
        };
    }, []);

    const handleUnmute = () => {
        if (playerRef.current) {
            playerRef.current.unMute();
            playerRef.current.setVolume(100);
            setMuted(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black font-[Manrope] overflow-hidden">

            {/* Player YouTube em cover — cobre toda a tela */}
            <div
                id="yt-intro-player"
                style={{
                    position:  'absolute',
                    top:       '50%',
                    left:      '50%',
                    transform: 'translate(-50%, -50%)',
                    /* cobre a tela mantendo proporção 16:9 */
                    width:  'max(100vw, calc(100vh * 16 / 9))',
                    height: 'max(100vh, calc(100vw * 9 / 16))',
                    pointerEvents: 'none',
                }}
            />

            {/* Botão de ativar som — canto inferior esquerdo */}
            {muted && (
                <button
                    onClick={handleUnmute}
                    className="absolute bottom-8 left-6 z-10 flex items-center gap-2 px-4 py-2.5 bg-black/50 backdrop-blur border border-white/25 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all"
                >
                    🔇 Clique para ouvir
                </button>
            )}

            {/* Botão pular — aparece após 3 s, canto inferior direito */}
            {showSkip && (
                <button
                    onClick={goToPortal}
                    className="absolute bottom-8 right-6 z-10 px-5 py-2.5 bg-black/40 backdrop-blur border border-white/25 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all"
                >
                    Pular introdução →
                </button>
            )}
        </div>
    );
}

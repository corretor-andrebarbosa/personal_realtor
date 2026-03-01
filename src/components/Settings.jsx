import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, Upload, Database, PaintBucket, Brain, Globe, Save, Image, CheckCircle, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { systemConfig } from '../system-config';
import { useProperties } from '../contexts/PropertyContext';

const Settings = () => {
    const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('ab-primary-color') || '#166b9c');
    const [logoUrl, setLogoUrl] = useState(localStorage.getItem('ab-logo-url') || '');
    const [whatsapp, setWhatsapp] = useState(localStorage.getItem('ab-whatsapp') || '');
    const [socials, setSocials] = useState(JSON.parse(localStorage.getItem('ab-socials') || '{"instagram":"","linkedin":"","facebook":"","youtube":"","tiktok":""}'));
    const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem('ab-system-prompt') || `Você é Kaleb, um assistente especializado em vendas de imóveis de alto padrão. Seu objetivo é ajudar o corretor ${systemConfig.brokerName} a fechar mais negócios. Utilize uma linguagem profissional, proativa e direta. Sempre pergunte sobre o próximo passo.`);
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('ab-gemini-key') || '');
    const [groqKey, setGroqKey] = useState(localStorage.getItem('ab-groq-key') || '');
    const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('ab-supabase-url') || '');
    const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('ab-supabase-key') || '');
    const [saved, setSaved] = useState(false);
    const { properties, syncAllLocal, isSyncing } = useProperties();
    const [syncStatus, setSyncStatus] = useState(null);
    const pendingCount = properties.filter(p => String(p.id).startsWith('local-') || p._isLocal).length;
    const logoInputRef = useRef(null);
    const profileInputRef = useRef(null);

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setLogoUrl(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleProfileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            localStorage.setItem('ab-profile-photo', ev.target.result);
            alert('Foto de perfil salva! Ela aparecerá na seção "Sobre" do site público.');
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        // ✅ mudança pontual: whatsapp sempre só dígitos
        const whatsappDigits = String(whatsapp || '').replace(/\D/g, '');

        localStorage.setItem('ab-primary-color', primaryColor);
        localStorage.setItem('ab-logo-url', logoUrl);
        localStorage.setItem('ab-whatsapp', whatsappDigits);
        localStorage.setItem('ab-socials', JSON.stringify(socials));
        localStorage.setItem('ab-system-prompt', systemPrompt);
        localStorage.setItem('ab-gemini-key', geminiKey);
        localStorage.setItem('ab-groq-key', groqKey);
        localStorage.setItem('ab-supabase-url', supabaseUrl);
        localStorage.setItem('ab-supabase-key', supabaseKey);

        document.documentElement.style.setProperty('--primary-color', primaryColor);

        // Derive dark and light versions
        const hex = primaryColor;
        document.documentElement.style.setProperty('--primary-dark', hex);
        document.documentElement.style.setProperty('--primary-light', hex);

        // mantém o input atualizado já sanitizado
        setWhatsapp(whatsappDigits);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSync = async () => {
        setSyncStatus('syncing');
        const result = await syncAllLocal();
        if (result.success) {
            setSyncStatus('success');
            setTimeout(() => setSyncStatus(null), 3000);
        } else {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus(null), 3000);
        }
    };

    return (
        <div className="pb-24 min-h-screen bg-slate-50">
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <SettingsIcon size={20} /> Configurações
                </h1>
                <Link to="/website" className="text-[var(--primary-color)] text-xs font-bold border border-[var(--primary-color)] px-3 py-1.5 rounded-full hover:bg-blue-50 flex items-center gap-1">
                    <Globe size={14} /> Ver Landing Page
                </Link>
            </header>

            {saved && (
                <div className="fixed top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-slide-in">
                    <CheckCircle size={18} /> Configurações salvas!
                </div>
            )}

            <div className="p-4 space-y-6 max-w-lg mx-auto">

                {/* White Label Settings */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        <PaintBucket size={16} /> Identidade Visual & Contato
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Cor Primária</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 p-1"
                                />
                                <span className="text-sm font-mono text-slate-500">{primaryColor}</span>
                                <div className="flex-1 h-10 rounded-lg" style={{ backgroundColor: primaryColor }}></div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Logo do Site</label>
                            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

                            <div className="flex items-center gap-3">
                                {logoUrl ? (
                                    <div className="h-12 bg-slate-50 rounded-lg border border-slate-200 px-3 flex items-center">
                                        <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
                                    </div>
                                ) : (
                                    <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                        <Image size={20} />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="px-4 py-2 bg-blue-50 text-[var(--primary-color)] rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                >
                                    <Upload size={14} className="inline mr-1" /> {logoUrl ? 'Trocar Logo' : 'Enviar Logo'}
                                </button>
                                {logoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setLogoUrl('')}
                                        className="text-xs text-red-400 hover:text-red-600 font-bold"
                                    >
                                        Remover
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Essa logo vai substituir o texto "{systemConfig.brokerName}" no canto superior esquerdo do site.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Foto de Perfil (Seção Sobre)</label>
                            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
                            <button
                                type="button"
                                onClick={() => profileInputRef.current?.click()}
                                className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                                <Upload size={14} className="inline mr-1" /> Enviar Foto de Perfil
                            </button>
                            <p className="text-[10px] text-slate-400 mt-1">Esta foto aparecerá na seção "Sobre Mim" do site público.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">WhatsApp (com DDD e código do país)</label>
                            <input
                                type="text"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                placeholder="5581999999999"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Instagram</label>
                                <input
                                    type="text"
                                    value={socials.instagram}
                                    onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                                    placeholder="instagram.com/seu.perfil"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Facebook</label>
                                <input
                                    type="text"
                                    value={socials.facebook || ''}
                                    onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                                    placeholder="facebook.com/seu.perfil"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">LinkedIn</label>
                                <input
                                    type="text"
                                    value={socials.linkedin}
                                    onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
                                    placeholder="linkedin.com/in/seu-perfil"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">YouTube</label>
                                <input
                                    type="text"
                                    value={socials.youtube || ''}
                                    onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
                                    placeholder="youtube.com/@seucanal"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 mb-1">TikTok</label>
                                <input
                                    type="text"
                                    value={socials.tiktok || ''}
                                    onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
                                    placeholder="tiktok.com/@seuperfil"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Database Sync */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                            <Globe size={16} /> Sincronização em Nuvem
                        </h2>
                        {(supabaseUrl && supabaseKey) && (
                            <button
                                onClick={() => {
                                    const baseUrl = window.location.origin;
                                    const syncLink = `${baseUrl}/login?syncUrl=${encodeURIComponent(supabaseUrl)}&syncKey=${encodeURIComponent(supabaseKey)}`;
                                    const waLink = `https://wa.me/?text=${encodeURIComponent(`Para sincronizar seu celular com o Corretor ${systemConfig.brokerName}, clique aqui: ` + syncLink)}`;
                                    window.open(waLink, '_blank');
                                }}
                                className="text-[10px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-1"
                                title="Enviar chaves para o celular"
                            >
                                <Share2 size={12} /> Sincronizar Celular
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Para ver seus imóveis e leads em <strong>todos os seus dispositivos</strong>, conecte um banco de dados Supabase. Use o botão acima para enviar a configuração ao celular via WhatsApp.
                        </p>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Supabase Project URL</label>
                            <input
                                type="text"
                                value={supabaseUrl}
                                onChange={(e) => setSupabaseUrl(e.target.value)}
                                placeholder="https://xyz.supabase.co"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Supabase API Key (Anon)</label>
                            <input
                                type="password"
                                value={supabaseKey}
                                onChange={(e) => setSupabaseKey(e.target.value)}
                                placeholder="eyJhbG..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                            />
                        </div>
                        <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline block">Criar banco de dados gratuito no Supabase</a>
                    </div>

                    {pendingCount > 0 && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-blue-800">{pendingCount} Imóveis Pendentes</p>
                                    <p className="text-xs text-blue-600">Estes imóveis estão apenas no seu navegador atual.</p>
                                </div>
                                <button
                                    onClick={handleSync}
                                    disabled={isSyncing || syncStatus === 'syncing'}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${syncStatus === 'success' ? 'bg-emerald-500 text-white' :
                                            syncStatus === 'error' ? 'bg-red-500 text-white' :
                                                'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                        }`}
                                >
                                    {syncStatus === 'syncing' ? 'Sincronizando...' :
                                        syncStatus === 'success' ? 'Sincronizado!' :
                                            syncStatus === 'error' ? 'Erro na Conexão' :
                                                'Sincronizar Agora'}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Kaleb LLM Training */}
                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Brain size={100} />
                    </div>

                    <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--primary-color)]">
                        <Database size={16} /> Treinar Kaleb (LLM)
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">Instruções do Sistema (System Prompt)</label>
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-[var(--primary-color)] outline-none resize-none leading-relaxed"
                                placeholder="Defina como o Kaleb deve se comportar..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Google Gemini API Key (Grátis)</label>
                                <input
                                    type="password"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                                />
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 block">Pegar chave grátis do Gemini</a>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Groq API Key (Grátis)</label>
                                <input
                                    type="password"
                                    value={groqKey}
                                    onChange={(e) => setGroqKey(e.target.value)}
                                    placeholder="gsk_..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                                />
                                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 block">Pegar chave grátis do Groq</a>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400">O sistema alternará entre Gemini e Groq automaticamente para economizar limites gratuitos.</p>
                    </div>
                </section>

                <button
                    onClick={handleSave}
                    className="w-full bg-[var(--primary-color)] text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[var(--primary-dark)] transition-all flex items-center justify-center gap-2"
                >
                    <Save size={18} /> Salvar Alterações
                </button>
            </div>
        </div>
    );
};

export default Settings;
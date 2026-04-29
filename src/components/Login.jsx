
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldAlert, Globe, Trash2 } from "lucide-react";
import { translations } from "../translations";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [logoError, setLogoError] = useState(false);

  const [lang] = useState(localStorage.getItem('ab-user-lang') || 'pt');
  const t = (key) => translations[lang][key] || translations['pt'][key] || key;

  const handleClearCache = () => {
    if (confirm(t('login_confirm_reset'))) {
      // Preserva todas as configurações do site antes de limpar
      const keysToPreserve = [
        'ab-whatsapp', 'ab-socials', 'ab-primary-color',
        'ab-system-prompt', 'ab-gemini-key', 'ab-groq-key',
        'ab-logo-url', 'ab-profile-photo',
        'ab-supabase-url', 'ab-supabase-key',
        'ab-user-lang',
      ];
      const saved = {};
      keysToPreserve.forEach(k => {
        const v = localStorage.getItem(k);
        if (v !== null) saved[k] = v;
      });
      localStorage.clear();
      Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
      window.location.reload();
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("network") ||
          error.message.includes("ERR_NAME_NOT_RESOLVED")
        ) {
          setErr(t('login_err_network'));
        } else if (error.message.includes("Invalid login credentials")) {
          setErr("E-mail ou senha incorretos.");
        } else {
          setErr(error.message);
        }
        return;
      }

      if (data?.session) {
        localStorage.setItem('ab-auth-session', JSON.stringify({ timestamp: Date.now() }));
        localStorage.setItem('authToken', data.session.access_token);
        navigate("/admin");
      }
    } catch (e2) {
      console.error('[Login] Erro inesperado:', e2);
      // Erro de rede — Brave Shield ou sem internet
      if (e2?.message?.includes('fetch') || e2?.name === 'TypeError') {
        setErr('Bloqueio de rede detectado. Se estiver usando Brave, desative o Brave Shield para este site (ícone 🦁 na barra de endereço).');
      } else {
        setErr(t('login_err_unexpected'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-indigo-50 font-['Manrope']">
      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-2xl shadow-blue-500/10 border border-slate-100 p-8 md:p-10 relative overflow-hidden">

        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="relative flex items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              {!logoError ? (
                <img
                  src={localStorage.getItem('ab-logo-url') || '/newlogo2.png'}
                  alt="Logo"
                  className="h-12 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Lock size={20} />
                  </div>
                  <span className="text-xl font-extrabold tracking-tight text-slate-800">
                    PB
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t('login_title')}</h1>
            <p className="text-slate-400 text-sm font-medium">{t('login_subtitle')}</p>
          </div>

          {err && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{err}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">{t('login_email')}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-semibold text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">{t('login_password')}</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-semibold text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? t('login_loading') : <>{t('login_button')} <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center flex flex-col gap-3">
            <button
              onClick={handleClearCache}
              className="text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={10} /> {t('login_reset')}
            </button>

            <a href="/" className="text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors inline-flex items-center justify-center gap-2">
              <Globe size={14} /> {t('login_view_site')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase, getKeys } from '../lib/supabaseClient';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const supabaseReady = useMemo(() => {
    const { supabaseUrl, supabaseAnonKey } = getKeys();
    return Boolean(supabase && supabaseUrl && supabaseAnonKey);
  }, []);

  // Se já estiver autenticado (app session), pula pro admin
  useEffect(() => {
    const sessionStr = localStorage.getItem('ab-auth-session');
    if (!sessionStr) return;
    try {
      const session = JSON.parse(sessionStr);
      if (session?.timestamp && (Date.now() - session.timestamp < 30 * 60 * 1000)) {
        navigate('/admin', { replace: true });
      }
    } catch {
      // ignora
    }
  }, [navigate]);

  const persistAppSession = (user, accessToken) => {
    // Mantém compatibilidade com o App.jsx atual (30min rolling)
    const payload = {
      timestamp: Date.now(),
      userId: user?.id || null,
      email: user?.email || null
    };
    localStorage.setItem('ab-auth-session', JSON.stringify(payload));
    if (accessToken) localStorage.setItem('authToken', accessToken);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!supabaseReady) {
      setErrorMsg('Supabase não configurado no projeto (URL/ANON KEY).');
      return;
    }

    if (!isOnline) {
      setErrorMsg('Sem internet no momento. Conecte-se para entrar.');
      return;
    }

    const safeEmail = (email || '').trim();
    const safePassword = password || '';

    if (!safeEmail || !safePassword) {
      setErrorMsg('Informe email e senha.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password: safePassword,
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('invalid login credentials')) {
          setErrorMsg('Credenciais inválidas. Verifique email e senha.');
        } else if (msg.includes('email not confirmed')) {
          setErrorMsg('Seu email ainda não foi confirmado no Supabase. Confirme o email ou desative confirmação temporariamente no painel.');
        } else {
          setErrorMsg(error.message || 'Erro ao autenticar.');
        }
        return;
      }

      const user = data?.user;
      const accessToken = data?.session?.access_token;

      persistAppSession(user, accessToken);
      navigate('/admin', { replace: true });
    } catch (err) {
      setErrorMsg('Falha de rede ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative">

        {/* Badge topo (opcional manter) */}
        <div className="absolute top-4 right-4">
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${(isOnline && supabaseReady)
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
          >
            {(isOnline && supabaseReady) ? 'ONLINE' : 'BANCO/OFFLINE'}
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-800 text-center mb-2">Área do Corretor</h1>
        <p className="text-slate-500 text-sm text-center mb-6">
          Acesse o painel administrativo para gerenciar seus imóveis e leads.
        </p>

        {/* Erro */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl p-3 mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">EMAIL</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[var(--primary-color)]"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">SENHA</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[var(--primary-color)]"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[var(--primary-color)] hover:bg-[var(--primary-dark)]'
              }`}
          >
            {loading ? 'Entrando...' : <>Entrar no Sistema <ArrowRight size={18} /></>}
          </button>
        </form>

        {/* ✅ ÚNICA COISA ABAIXO DO BOTÃO */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
            Voltar para o Site
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
=======
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
      localStorage.clear();
      window.location.reload();
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!supabase) {
      setErr(t('login_err_connection'));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("network")) {
          setErr(t('login_err_network'));
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
      setErr(t('login_err_unexpected'));
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
                  src={localStorage.getItem('ab-logo-url') || '/newlogo.png'}
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
>>>>>>> da43ae91d6726ce15ea8e715ca4648eb30dfa935

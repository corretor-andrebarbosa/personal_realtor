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
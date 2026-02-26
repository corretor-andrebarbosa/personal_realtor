import React, { useState, useEffect } from "react";
import { supabase, setKeys, getKeys } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldAlert, CheckCircle2, Database, Globe, RefreshCcw, Trash2, AlertTriangle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("cap.barbosa@yahoo.com");
  const [password, setPassword] = useState("4ever10565");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  // States for manual config
  const [manualUrl, setManualUrl] = useState("");
  const [manualAnon, setManualAnon] = useState("");
  const [configSaved, setConfigSaved] = useState(false);

  const currentKeys = getKeys();

  useEffect(() => {
    // Se não houver supabase inicializado ou a chave for placeholder, abre a config
    if (!supabase || !currentKeys.supabaseAnonKey || currentKeys.supabaseAnonKey.includes("COLE_AQUI")) {
      const timer = setTimeout(() => setShowConfig(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [currentKeys.supabaseAnonKey]);

  const handleSaveConfig = () => {
    setErr("");

    if (!manualUrl || !manualAnon) {
      setErr("Por favor, preencha a URL e a Chave Anon.");
      return;
    }

    // Validação CRÍTICA: Impedir colar o token do Vercel
    if (manualAnon.includes("RS256") || manualAnon.length > 500) {
      setErr("ERRO: Você colou um Token do Vercel (RS256). O Supabase precisa da 'anon public key' (HS256) que fica no painel Settings > API.");
      return;
    }

    const saved = setKeys({
      supabaseUrl: manualUrl.trim(),
      supabaseAnonKey: manualAnon.trim()
    });

    if (saved) {
      setConfigSaved(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      setErr("Erro ao salvar configuração. Verifique os dados.");
    }
  };

  const handleClearCache = () => {
    if (confirm("Deseja limpar todas as configurações e reiniciar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!supabase) {
      setErr("Banco de dados não conectado. Clique no suporte abaixo.");
      setShowConfig(true);
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
          setErr("Falha na Conexão: Verifique se sua internet está OK e se o Brave Shield (o leãozinho) está DESATIVADO para este site.");
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
      setErr("Erro inesperado ao tentar logar.");
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
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
              <Lock size={28} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Área do Corretor</h1>
            <p className="text-slate-400 text-sm font-medium">Controle total da sua imobiliária</p>
          </div>

          {err && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{err}</p>
            </div>
          )}

          {configSaved && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3">
              <CheckCircle2 size={18} />
              <p className="text-xs font-bold">Configuração salva! Reiniciando...</p>
            </div>
          )}

          {!showConfig ? (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-semibold text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {loading ? "Verificando..." : <>Acessar Painel <ArrowRight size={18} /></>}
              </button>
            </form>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-xs text-amber-800">Conexão Pendente</h3>
                  <p className="text-[10px] text-amber-600 leading-tight mt-0.5">As chaves do Supabase no seu arquivo .env estão erradas ou incompletas. Corrija abaixo para conectar.</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={manualUrl || currentKeys.supabaseUrl || ''}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="URL do Supabase (https://...)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs focus:border-blue-500 outline-none"
                />

                <div className="relative">
                  <input
                    type="password"
                    value={manualAnon}
                    onChange={(e) => setManualAnon(e.target.value)}
                    placeholder="Cole aqui a ANON KEY (HS256)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs focus:border-blue-500 outline-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 ml-1 italic">Dica: Pegue a chave no menu Settings &gt; API do seu Supabase.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowConfig(false)} className="px-4 py-3.5 text-slate-400 font-bold text-xs hover:bg-slate-50 rounded-2xl">Voltar</button>
                <button onClick={handleSaveConfig} className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs">
                  Salvar e Conectar <Database size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-50 text-center flex flex-col gap-3">
            <button
              onClick={handleClearCache}
              className="text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={10} /> Resetar Aplicação (Limpar Cache)
            </button>

            <a href="/" className="text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors inline-flex items-center justify-center gap-2">
              <Globe size={14} /> Ver Site Comercial
            </a>

            {!showConfig && (
              <button
                onClick={() => setShowConfig(true)}
                className="text-[9px] uppercase tracking-widest font-extrabold text-blue-400/50 hover:text-blue-500 transition-colors mt-2"
              >
                <RefreshCcw size={8} className="inline mr-1" /> Reconfigurar Banco de Dados
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
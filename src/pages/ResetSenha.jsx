import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { translations } from "../translations";

export default function ResetSenha() {
  const navigate = useNavigate();
  const [lang] = useState(localStorage.getItem("ab-user-lang") || "pt");
  const t = (key) => (translations[lang] || {})[key] || translations["pt"][key] || key;

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // supabase-js v2 processa automaticamente o hash #access_token=...&type=recovery
    // e dispara PASSWORD_RECOVERY via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Se o token já foi processado antes do listener ser registrado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Fallback: se após 5 s não houver sessão, o link é inválido/expirado
    const timeout = setTimeout(() => {
      setExpired(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Cancela o timeout se já ficou ready
  useEffect(() => {
    if (ready) setExpired(false);
  }, [ready]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (newPassword.length < 6) { setErr(t("reset_err_min")); return; }
    if (newPassword !== confirm) { setErr(t("reset_err_mismatch")); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setErr(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/admin"), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-indigo-50 font-['Manrope']">
      <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-2xl shadow-blue-500/10 border border-slate-100 p-8 md:p-10 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Lock size={24} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t("reset_title")}</h1>
            <p className="text-slate-400 text-sm font-medium">{t("reset_subtitle")}</p>
          </div>

          {success ? (
            <div className="p-5 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-start gap-3">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold leading-relaxed">{t("reset_success")}</p>
            </div>
          ) : expired && !ready ? (
            <div className="p-5 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-start gap-3">
              <ShieldAlert size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold leading-relaxed">{t("reset_err_expired")}</p>
            </div>
          ) : !ready ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {err && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-start gap-3">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">{err}</p>
                </div>
              )}
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">{t("reset_new_password")}</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-semibold text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">{t("reset_confirm_password")}</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-semibold text-sm"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {loading ? t("reset_loading") : t("reset_button")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

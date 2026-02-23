import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient"; // Verifique se o arquivo supabaseClient.js está na pasta 'lib'
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    // ✅ Correção: Verifica se o cliente Supabase foi inicializado corretamente
    if (!supabase) {
      setErr("Erro de configuração: O sistema não conseguiu conectar ao banco de dados. Verifique o console para mais detalhes.");
      console.error("Supabase client é nulo. Verifique se o arquivo .env existe e foi carregado corretamente (reinicie o servidor com 'npm run dev').");
      setLoading(false);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error) {
        // ✅ Correção: Tradução de erros comuns para melhorar a usabilidade
        console.error("Erro Supabase:", error);
        if (error.message.includes("Invalid login credentials")) {
          setErr("Email ou senha incorretos.");
        } else if (error.message.includes("Email not confirmed")) {
          setErr("Por favor, confirme seu email antes de entrar.");
        } else {
          setErr(error.message);
        }
        return;
      }

      // Logado
      if (data?.session) {
        navigate("/properties"); // ajuste para sua rota interna pós-login
      } else {
        setErr("Login não retornou sessão. Verifique confirmação do email.");
      }
    } catch (e2) {
      console.error("Erro inesperado no catch:", e2);
      setErr("Ocorreu um erro inesperado no sistema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20 }}>
      <h2>Área do Corretor</h2>

      {err ? (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, margin: "12px 0" }}>
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div>
          <label>Senha</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            background: "#0b5d88",
            color: "white",
            border: 0,
            borderRadius: 10,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Entrando..." : "Entrar no Sistema →"}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        <a href="/#imoveis" style={{ color: "#64748b" }}>
          Voltar para o Site
        </a>
      </div>
    </div>
  );
}
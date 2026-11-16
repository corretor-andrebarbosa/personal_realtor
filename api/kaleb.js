export async function onRequest(context) {
  const { request, env } = context;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const { prompt } = await request.json();
    if (!prompt) return json({ error: 'Prompt vazio.' }, 400);

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
    // As chaves de LLM não são mais legíveis pela chave pública: use variáveis de ambiente
    // ou a service role (nunca exposta ao navegador)
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Só o admin logado usa o assistente: valida o token da sessão no Supabase Auth
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token || !supabaseUrl || !supabaseKey) return json({ error: 'Não autorizado.' }, 401);
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return json({ error: 'Não autorizado.' }, 401);
    if (String(prompt).length > 20000) return json({ error: 'Texto muito longo.' }, 413);

    let groqKey = env.GROQ_API_KEY || '';
    let geminiKey = env.GEMINI_API_KEY || '';

    if (supabaseUrl && (!groqKey && !geminiKey)) {
      // lê as chaves salvas no painel com o token do próprio admin
      const res = await fetch(
        `${supabaseUrl}/rest/v1/site_settings?id=eq.default&select=groq_key,gemini_key`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${serviceKey || token}` } }
      );
      const [settings] = await res.json().catch(() => [{}]);
      groqKey = settings?.groq_key || '';
      geminiKey = settings?.gemini_key || '';
    }

    if (!groqKey && !geminiKey) {
      return json({ error: 'Chave de API não configurada. Vá em Configurações → Treinar Kaleb e salve a chave do Groq ou Gemini.' }, 400);
    }

    let text;

    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(`Groq: ${data.error.message}`);
      text = data.choices[0].message.content;
    } else {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(`Gemini: ${data.error.message}`);
      text = data.candidates[0].content.parts[0].text;
    }

    return json({ text });
  } catch (e) {
    return json({ error: e.message || 'Erro ao processar.' }, 500);
  }
}

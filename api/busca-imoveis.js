export async function onRequest(context) {
  const { request, env } = context;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const params = await request.json();
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Configuração do servidor incompleta.' }, 500);
    }

    const sbHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

    // Busca imóveis e chaves de API em paralelo
    const [propRes, settingsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/properties?select=id,title,type,address,salePrice,rentalPrice,price,rooms,area,description&limit=100`, { headers: sbHeaders }),
      fetch(`${supabaseUrl}/rest/v1/site_settings?id=eq.default&select=groq_key,gemini_key`, { headers: sbHeaders }),
    ]);

    const properties = await propRes.json().catch(() => []);
    const [settings] = await settingsRes.json().catch(() => [{}]);

    const groqKey = settings?.groq_key || env.GROQ_API_KEY || '';
    const geminiKey = settings?.gemini_key || env.GEMINI_API_KEY || '';

    if (!groqKey && !geminiKey) {
      return json({ error: 'Chave de API não configurada. Vá em Configurações → Treinar Kaleb e salve a chave do Groq ou Gemini.' }, 400);
    }

    const propList = Array.isArray(properties) && properties.length > 0
      ? properties.map(p =>
          `ID:${p.id} | ${p.title} | ${p.type} em ${p.address} | ` +
          `Venda: R$${(p.salePrice || p.price || 0).toLocaleString('pt-BR')} | ` +
          `Aluguel: R$${(p.rentalPrice || 0).toLocaleString('pt-BR')} | ` +
          `${p.rooms || 0} quartos | ${p.area || 0}m² | ` +
          (p.description ? p.description.slice(0, 120) : '')
        ).join('\n')
      : 'Nenhum imóvel cadastrado ainda.';

    const prompt = `Você é um assistente imobiliário especialista em João Pessoa, PB, Brasil.

O usuário está buscando:
- Tipo: ${params.tipo}
- Cidade/bairro: ${params.cidade || 'João Pessoa, PB'}
- Finalidade: ${params.finalidade}
- Preço máximo: ${params.preco}
- Quartos mínimos: ${params.quartos}
- Área mínima: ${params.area}
- Diferenciais: ${(params.diferenciais || []).join(', ')}
- Prioridades (1-5): custo-benefício ${params.prioridades?.p1}, localização ${params.prioridades?.p2}, valorização ${params.prioridades?.p3}, infraestrutura ${params.prioridades?.p4}
- Observações: ${params.obs || 'Nenhuma'}

Catálogo de imóveis disponíveis:
${propList}

Selecione os 3 melhores imóveis do catálogo para o perfil acima. Se não houver imóveis suficientes no catálogo, crie sugestões genéricas realistas para João Pessoa.
Responda APENAS com JSON válido, sem markdown, sem texto fora do JSON:
{
  "imoveis": [
    {
      "nome": "Nome do imóvel",
      "endereco": "Bairro, João Pessoa — XXm² · X quartos · X vaga(s)",
      "preco": "R$ X.XXX.XXX",
      "precoM2": "R$ X.XXX/m²",
      "destaques": ["até 4 itens"],
      "scores": {
        "custo-beneficio": "9.0",
        "localizacao": "8.5",
        "valorizacao": "8.0",
        "infraestrutura": "8.5"
      },
      "analise": "2-3 frases explicando por que este imóvel é ideal para este perfil.",
      "catalogoId": "ID_do_imovel_se_estiver_no_catalogo_senao_null",
      "fonte": "André Barbosa"
    }
  ]
}`;

    let result;

    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(`Groq: ${data.error.message}`);
      result = JSON.parse(data.choices[0].message.content);
    } else {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(`Gemini: ${data.error.message}`);
      result = JSON.parse(data.candidates[0].content.parts[0].text);
    }

    return json(result);
  } catch (e) {
    return json({ error: e.message || 'Erro ao processar busca.' }, 500);
  }
}

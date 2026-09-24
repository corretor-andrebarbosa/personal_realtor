export interface Env {
  GROQ_API_KEY: string;
  SERPER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

function getCorsHeaders(origin: string | null) {
  const isLocalhost = origin?.match(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
  const allowed =
    origin && (origin === "https://andrebarbosaimoveis.com" || isLocalhost)
      ? origin
      : "https://andrebarbosaimoveis.com";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const corsHeaders = getCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let params: BuscaParams;
    try {
      params = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1. Busca em paralelo: Google (anúncios reais) + catálogo interno André
    const [googleResults, catalogo] = await Promise.all([
      searchGoogle(params, env.SERPER_API_KEY),
      fetchCatalogo(params, env),
    ]);

    // 2. LLM analisa, extrai dados e ranqueia
    let imoveis: Imovel[];
    try {
      imoveis = await callGroq(buildPrompt(params, catalogo, googleResults), env.GROQ_API_KEY);
      if (imoveis.length === 0) {
        imoveis = buildFallbackResults(catalogo, googleResults);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3. Histórico (fire-and-forget)
    saveToSupabase(params, imoveis, env).catch(() => {});

    return new Response(JSON.stringify({ imoveis }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BuscaParams {
  tipo: string;
  cidade: string;
  finalidade: string;
  preco: string;
  quartos: string;
  area: string;
  diferenciais: string[];
  prioridades: { p1: number; p2: number; p3: number; p4: number };
  obs: string;
}

interface GoogleResult {
  title: string;
  link: string;
  snippet: string;
}

function buildFallbackResults(catalogo: PropCatalogo[], google: GoogleResult[]): Imovel[] {
  const catalogoResults = catalogo
    .filter((prop) => prop.salePrice || prop.rentalPrice)
    .slice(0, 3)
    .map((prop) => {
      const price = prop.salePrice ?? prop.rentalPrice ?? 0;
      const priceLabel = prop.salePrice
        ? `R$ ${prop.salePrice.toLocaleString("pt-BR")}`
        : `R$ ${prop.rentalPrice?.toLocaleString("pt-BR")}/mês`;
      return {
        catalogoId: prop.id,
        fonte: "André Barbosa",
        nome: prop.title,
        endereco: `${prop.address} — ${prop.area ?? "?"}m² · ${prop.rooms ?? "?"} quartos · ${prop.garage ?? 0} vagas`,
        preco: priceLabel,
        precoM2: prop.area ? `R$ ${Math.round(price / prop.area).toLocaleString("pt-BR")}/m²` : "Não informado",
        destaques: [prop.type, prop.bathrooms ? `${prop.bathrooms} banheiros` : "Imóvel disponível"],
        scores: { "custo-beneficio": "8.0", localizacao: "8.0", valorizacao: "8.0", infraestrutura: "8.0" },
        analise: prop.description?.slice(0, 240) || "Imóvel disponível no catálogo André Barbosa.",
      };
    });

  if (catalogoResults.length > 0) return catalogoResults;

  return google.slice(0, 3).map((result) => ({
    url: result.link,
    fonte: "Anúncio online",
    nome: result.title,
    endereco: "Localização conforme anúncio",
    preco: "Consultar anúncio",
    precoM2: "Não informado",
    destaques: ["Resultado online"],
    scores: { "custo-beneficio": "7.0", localizacao: "7.0", valorizacao: "7.0", infraestrutura: "7.0" },
    analise: result.snippet,
  }));
}

interface PropCatalogo {
  id: string;
  title: string;
  type: string;
  status: string;
  salePrice: number | null;
  rentalPrice: number | null;
  area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  garage: number | null;
  address: string;
  description: string;
}

export interface Imovel {
  nome: string;
  endereco: string;
  preco: string;
  precoM2: string;
  destaques: string[];
  scores: {
    "custo-beneficio": string;
    localizacao: string;
    valorizacao: string;
    infraestrutura: string;
  };
  analise: string;
  url?: string;        // link do anúncio real (ZapImóveis, VivaReal, OLX…)
  fonte?: string;      // "ZapImóveis" | "VivaReal" | "OLX" | "André Barbosa"
  catalogoId?: string; // ID interno (apenas imóveis de André)
}

// ─── Google Search via Serper.dev ─────────────────────────────────────────────

async function searchGoogle(params: BuscaParams, apiKey: string): Promise<GoogleResult[]> {
  const tipo = params.tipo && params.tipo !== "Todos" ? params.tipo.toLowerCase() : "imóvel";
  const cidade = params.cidade || "João Pessoa PB";

  const precoStr = params.preco.includes("300")
    ? "até 300 mil"
    : params.preco.includes("600")
    ? "até 600 mil"
    : params.preco.includes("1 milh")
    ? "até 1 milhão"
    : "";

  const quartosStr =
    params.quartos && params.quartos !== "1+" ? `${params.quartos} quartos` : "";

  const finalidade =
    params.finalidade === "Alugar" ? "aluguel" : "à venda";

  const query = [tipo, finalidade, cidade, precoStr, quartosStr]
    .filter(Boolean)
    .join(" ");

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: 10 }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { organic?: GoogleResult[] };
    return (data.organic || []).slice(0, 8);
  } catch {
    return [];
  }
}

// ─── Catálogo interno André (sem contact_agent) ───────────────────────────────

async function fetchCatalogo(params: BuscaParams, env: Env): Promise<PropCatalogo[]> {
  const select =
    "id,title,type,status,salePrice,rentalPrice,area,rooms,bathrooms,garage,address,description";
  let filter = "status=eq.Disponível";
  if (params.tipo && params.tipo !== "Todos") {
    filter += `&type=eq.${encodeURIComponent(params.tipo)}`;
  }
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/properties?${filter}&select=${select}&limit=20`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json() as PropCatalogo[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(
  p: BuscaParams,
  catalogo: PropCatalogo[],
  google: GoogleResult[]
): string {
  const catalogoStr =
    catalogo.length > 0
      ? `\n\nCATÁLOGO INTERNO — André Barbosa Imóveis (prioridade máxima se relevante):\n` +
        catalogo
          .map((prop) => {
            const preco = prop.salePrice
              ? `Venda R$ ${Number(prop.salePrice).toLocaleString("pt-BR")}`
              : prop.rentalPrice
              ? `Aluguel R$ ${Number(prop.rentalPrice).toLocaleString("pt-BR")}/mês`
              : "Valor sob consulta";
            return `[ID:${prop.id}] ${prop.title} | ${prop.type} | ${preco} | ${prop.area ?? "?"}m² | ${prop.rooms ?? "?"}q | ${prop.address}\n${prop.description?.slice(0, 150) ?? ""}`;
          })
          .join("\n\n")
      : "";

  const googleStr =
    google.length > 0
      ? `\n\nRESULTADOS REAIS DO GOOGLE (ZapImóveis, VivaReal, OLX, etc.):\n` +
        google
          .map(
            (r, i) =>
              `[${i + 1}] Título: ${r.title}\nURL: ${r.link}\nDescrição: ${r.snippet}`
          )
          .join("\n\n")
      : "\n\nNenhum resultado encontrado no Google para estes parâmetros.";

  // Extrai valor numérico do preço máximo para reforçar no prompt
  const precoMaxNum = p.preco.includes("300") ? 300000
    : p.preco.includes("600") ? 600000
    : p.preco.includes("1 milh") ? 1000000
    : 9999999;
  const precoMaxFmt = `R$ ${precoMaxNum.toLocaleString("pt-BR")}`;

  return `Você é um consultor imobiliário especialista no mercado brasileiro, especialmente João Pessoa/PB.

⚠️ REGRA ABSOLUTA — PREÇO MÁXIMO: ${precoMaxFmt}
Todo imóvel com preço ACIMA de ${precoMaxFmt} deve ser DESCARTADO imediatamente, sem exceção.
Se um anúncio não informar preço claramente, exclua-o da seleção.

O usuário busca um imóvel com estes critérios:
- Tipo: ${p.tipo}
- Cidade/bairro: ${p.cidade || "João Pessoa/PB"}
- Finalidade: ${p.finalidade}
- Preço máximo: ${p.preco} (= ${precoMaxFmt})
- Quartos mínimos: ${p.quartos}
- Área mínima: ${p.area}
- Diferenciais: ${p.diferenciais.join(", ") || "nenhum"}
- Prioridades (1-5): Custo-benefício=${p.prioridades.p1}, Localização=${p.prioridades.p2}, Valorização futura=${p.prioridades.p3}, Infraestrutura=${p.prioridades.p4}
- Observações: ${p.obs || "nenhuma"}
${catalogoStr}
${googleStr}

Selecione os 3 melhores anúncios DENTRO DO PREÇO MÁXIMO de ${precoMaxFmt}.
Prefira imóveis do CATÁLOGO INTERNO se forem relevantes (use catalogoId).
Para resultados do Google, preencha "url" com a URL exata e "fonte" com o nome do site (ex: "ZapImóveis", "VivaReal", "OLX").
Extraia preço, metragem e localização dos títulos/descrições dos anúncios.

Retorne SOMENTE JSON válido, sem markdown.

Formato exato:
{
  "imoveis": [
    {
      "catalogoId": "uuid-ou-null",
      "url": "https://url-exata-do-anuncio-ou-null",
      "fonte": "ZapImóveis",
      "nome": "Título do imóvel",
      "endereco": "Bairro, Cidade — XXm² · X quartos · X vagas",
      "preco": "R$ XXX.XXX",
      "precoM2": "R$ X.XXX/m²",
      "destaques": ["tag1", "tag2", "tag3"],
      "scores": {
        "custo-beneficio": "8.5",
        "localizacao": "9.0",
        "valorizacao": "7.8",
        "infraestrutura": "8.2"
      },
      "analise": "2-3 frases justificando a escolha com base nos critérios do usuário."
    }
  ]
}

Ordene do melhor ao pior custo-benefício.`;
}

// ─── Groq ────────────────────────────────────────────────────────────────────

async function callGroq(prompt: string, apiKey: string): Promise<Imovel[]> {
  const models = [
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ];
  let lastError = "Groq não retornou um modelo disponível.";

  for (const model of models) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (res.ok) {
      const data = await res.json() as {
        choices: { message: { content: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content ?? "";

      let parsed: { imoveis: Imovel[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("O modelo retornou formato inválido. Tente novamente.");
      }

      return Array.isArray(parsed.imoveis) ? parsed.imoveis : [];
    }

    const err = await res.text();
    lastError = `Groq ${res.status}: ${err}`;
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

// ─── Histórico Supabase ───────────────────────────────────────────────────────

async function saveToSupabase(
  params: BuscaParams,
  imoveis: Imovel[],
  env: Env
): Promise<void> {
  await fetch(`${env.SUPABASE_URL}/rest/v1/buscas_imoveis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      params,
      resultados: imoveis,
      criado_em: new Date().toISOString(),
    }),
  });
}

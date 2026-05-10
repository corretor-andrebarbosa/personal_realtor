import { useState, useCallback } from 'react';

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? '/api/busca-imoveis';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Dados mock por faixa de preço — reflete o parâmetro selecionado pelo usuário
const MOCK_POR_FAIXA = {
  '300': [
    {
      nome: 'Apto Compacto Expedicionários',
      endereco: 'Expedicionários, João Pessoa — 48m² · 2 quartos · 1 vaga',
      preco: 'R$ 245.000',
      precoM2: 'R$ 5.104/m²',
      destaques: ['Varanda', 'Portaria eletrônica', 'Perto de escola', 'Transporte próximo'],
      scores: { 'custo-beneficio': '9.2', localizacao: '7.8', valorizacao: '7.5', infraestrutura: '7.6' },
      analise: 'Melhor custo-benefício da faixa até R$ 300 mil: preço por m² abaixo da média do bairro e proximidade com serviços essenciais. Boa opção de entrada no mercado imobiliário de João Pessoa.',
    },
    {
      nome: 'Residencial Mangabeira Park',
      endereco: 'Mangabeira, João Pessoa — 55m² · 2 quartos · 1 vaga',
      preco: 'R$ 265.000',
      precoM2: 'R$ 4.818/m²',
      destaques: ['Área de lazer', 'Playground', 'Pet friendly', 'Academia'],
      scores: { 'custo-beneficio': '8.8', localizacao: '8.1', valorizacao: '8.0', infraestrutura: '8.3' },
      analise: 'Mangabeira é o bairro com maior crescimento populacional de João Pessoa nos últimos 5 anos. Infraestrutura de lazer completa e área privativa maior que a média da faixa de preço.',
    },
    {
      nome: 'Cond. Vista Verde Valentina',
      endereco: 'Valentina de Figueiredo, João Pessoa — 52m² · 2 quartos · 1 vaga',
      preco: 'R$ 289.000',
      precoM2: 'R$ 5.558/m²',
      destaques: ['Condomínio fechado', 'Câmeras de segurança', 'Área verde', 'Churrasqueira'],
      scores: { 'custo-beneficio': '8.1', localizacao: '7.5', valorizacao: '7.9', infraestrutura: '8.0' },
      analise: 'Condomínio fechado com boa segurança dentro do orçamento de R$ 300 mil. Região em expansão com novos comércios e serviços sendo instalados, o que sugere valorização nos próximos anos.',
    },
  ],
  '600': [
    {
      nome: 'Residencial Alto do Miramar',
      endereco: 'Miramar, João Pessoa — 72m² · 2 quartos · 1 vaga',
      preco: 'R$ 385.000',
      precoM2: 'R$ 5.347/m²',
      destaques: ['Varanda gourmet', 'Portaria 24h', 'Academia', 'Pet friendly'],
      scores: { 'custo-beneficio': '9.1', localizacao: '8.7', valorizacao: '8.4', infraestrutura: '8.0' },
      analise: 'Localizado em um dos bairros mais valorizados de João Pessoa, com crescimento de 12% ao ano. A relação custo/m² é a melhor da faixa até R$ 600 mil na região, e a proximidade com a orla garante alta demanda para aluguel por temporada.',
    },
    {
      nome: 'Edifício Solaris Cabo Branco',
      endereco: 'Cabo Branco, João Pessoa — 68m² · 2 quartos · 1 vaga',
      preco: 'R$ 430.000',
      precoM2: 'R$ 6.323/m²',
      destaques: ['Vista mar parcial', 'Piscina', 'Salão de festas', 'Vaga coberta'],
      scores: { 'custo-beneficio': '8.3', localizacao: '9.2', valorizacao: '8.9', infraestrutura: '8.5' },
      analise: 'Excelente localização a 400m do calçadão de Cabo Branco, área com forte valorização e infraestrutura completa de comércio e serviços. Ideal para quem prioriza localização e pretende valorização no médio prazo.',
    },
    {
      nome: 'Condomínio Verde Vale',
      endereco: 'Bessa, João Pessoa — 75m² · 3 quartos · 2 vagas',
      preco: 'R$ 520.000',
      precoM2: 'R$ 6.933/m²',
      destaques: ['3 quartos', '2 vagas', 'Playground', 'Área verde'],
      scores: { 'custo-beneficio': '7.6', localizacao: '7.8', valorizacao: '7.4', infraestrutura: '8.8' },
      analise: 'Melhor opção em área familiar com 3 quartos e 2 vagas dentro do orçamento. A infraestrutura do condomínio é a mais completa das três opções, mas o bairro tem valorização mais moderada comparada a Miramar e Cabo Branco.',
    },
  ],
  '1000': [
    {
      nome: 'Cobertura Duplex Manaíra',
      endereco: 'Manaíra, João Pessoa — 140m² · 3 quartos · 2 vagas',
      preco: 'R$ 780.000',
      precoM2: 'R$ 5.571/m²',
      destaques: ['Cobertura duplex', 'Vista mar', 'Piscina privativa', 'Alto padrão'],
      scores: { 'custo-beneficio': '8.9', localizacao: '9.4', valorizacao: '9.1', infraestrutura: '9.2' },
      analise: 'Manaíra é o bairro nobre de referência em João Pessoa, com infraestrutura de alto padrão e alta liquidez no mercado de revenda. A metragem e localização justificam o investimento com retorno sólido.',
    },
    {
      nome: 'Residencial Beira Mar Tambaú',
      endereco: 'Tambaú, João Pessoa — 110m² · 3 quartos · 2 vagas',
      preco: 'R$ 850.000',
      precoM2: 'R$ 7.727/m²',
      destaques: ['Frente mar', 'Academia', 'Salão de festas', 'Portaria 24h'],
      scores: { 'custo-beneficio': '8.0', localizacao: '9.8', valorizacao: '9.3', infraestrutura: '9.0' },
      analise: 'Imóvel de localização excepcional na orla de Tambaú, com demanda constante para aluguel por temporada e alta valorização histórica. Ideal para investidor que busca renda passiva e patrimônio líquido.',
    },
    {
      nome: 'Condomínio Morada Real Altiplano',
      endereco: 'Altiplano, João Pessoa — 130m² · 3 quartos · 2 vagas',
      preco: 'R$ 920.000',
      precoM2: 'R$ 7.077/m²',
      destaques: ['Condomínio clube', 'Piscina', 'Espaço gourmet', 'Segurança 24h'],
      scores: { 'custo-beneficio': '7.8', localizacao: '8.9', valorizacao: '8.6', infraestrutura: '9.5' },
      analise: 'O Altiplano é o bairro de maior valorização de João Pessoa na última década, com perfil de alto padrão e infraestrutura de condomínio clube. Menor custo-benefício relativo mas maior prestígio e infraestrutura.',
    },
  ],
  'acima': [
    {
      nome: 'Penthouse Torre Atlântico',
      endereco: 'Bessa, João Pessoa — 220m² · 4 quartos · 3 vagas',
      preco: 'R$ 1.450.000',
      precoM2: 'R$ 6.590/m²',
      destaques: ['Penthouse', 'Vista 360°', '3 vagas', 'Terraço privativo'],
      scores: { 'custo-beneficio': '8.5', localizacao: '8.8', valorizacao: '8.7', infraestrutura: '9.3' },
      analise: 'Penthouse com metragem excepcional e vista panorâmica, preço por m² competitivo para o padrão. O Bessa tem crescido em sofisticação com novos empreendimentos de alto padrão nos últimos 3 anos.',
    },
    {
      nome: 'Cobertura Premium Manaíra Beira-Mar',
      endereco: 'Manaíra, João Pessoa — 280m² · 4 quartos · 4 vagas',
      preco: 'R$ 2.100.000',
      precoM2: 'R$ 7.500/m²',
      destaques: ['Beira-mar', 'Piscina privativa', '4 vagas', 'Home theater'],
      scores: { 'custo-beneficio': '7.9', localizacao: '9.9', valorizacao: '9.5', infraestrutura: '9.8' },
      analise: 'O imóvel mais exclusivo disponível na região, com localização e acabamento que justificam o investimento como reserva de valor de longo prazo. Alta liquidez no segmento de luxo de João Pessoa.',
    },
    {
      nome: 'Residencial Grand Tambaú',
      endereco: 'Tambaú, João Pessoa — 190m² · 3 quartos · 3 vagas',
      preco: 'R$ 1.750.000',
      precoM2: 'R$ 9.210/m²',
      destaques: ['Orla de Tambaú', 'Acabamento premium', 'Spa', 'Concierge'],
      scores: { 'custo-beneficio': '7.4', localizacao: '9.7', valorizacao: '9.2', infraestrutura: '9.6' },
      analise: 'Endereço de prestígio máximo em João Pessoa com serviços de concierge e spa integrados. Menor custo-benefício da lista mas com o maior índice de valorização histórica da cidade.',
    },
  ],
};

function getMockPorPreco(preco) {
  if (preco.includes('300')) return MOCK_POR_FAIXA['300'];
  if (preco.includes('1 milhão') || preco.includes('1 milh')) return MOCK_POR_FAIXA['1000'];
  if (preco.includes('Acima') || preco.includes('acima')) return MOCK_POR_FAIXA['acima'];
  return MOCK_POR_FAIXA['600']; // default: até R$ 600 mil
}

export function useBuscaImoveis() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [imoveis, setImoveis] = useState([]);
  const [erro, setErro] = useState(null);

  const buscar = useCallback(async (params) => {
    setStatus('loading');
    setErro(null);

    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 2500)); // simula latência da IA
      setImoveis(getMockPorPreco(params.preco));
      setStatus('success');
      return;
    }

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Erro ${res.status}`);
      }

      const data = await res.json();
      setImoveis(data.imoveis);
      setStatus('success');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
      setStatus('error');
    }
  }, []);

  const resetar = useCallback(() => {
    setStatus('idle');
    setImoveis([]);
    setErro(null);
  }, []);

  return { status, imoveis, erro, buscar, resetar };
}

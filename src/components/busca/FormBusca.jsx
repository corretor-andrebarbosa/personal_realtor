import { useState } from 'react';

const TIPOS = ['Apartamento', 'Casa', 'Cobertura', 'Studio', 'Terreno'];
const DIFERENCIAIS = [
  'Varanda / sacada', 'Vaga de garagem', 'Piscina', 'Academia',
  'Portaria 24h', 'Pet friendly', 'Próximo metrô/bus', 'Escola perto', 'Vista mar',
];
const LOADING_MSGS = [
  'Analisando seu perfil...',
  'Consultando dados de mercado...',
  'Avaliando infraestrutura e valorização...',
  'Gerando relatório personalizado...',
];

export function FormBusca({ onBuscar, loading }) {
  const [tipo, setTipo] = useState('Apartamento');
  const [cidade, setCidade] = useState('');
  const [finalidade, setFinalidade] = useState('Morar');
  const [preco, setPreco] = useState('Até R$ 600 mil');
  const [quartos, setQuartos] = useState('2+');
  const [area, setArea] = useState('60 m²+');
  const [difs, setDifs] = useState(['Varanda / sacada', 'Vaga de garagem']);
  const [prios, setPrios] = useState({ p1: 5, p2: 4, p3: 4, p4: 3 });
  const [obs, setObs] = useState('');
  const [msgIdx, setMsgIdx] = useState(0);

  const toggleDif = (d) =>
    setDifs((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const handleSubmit = () => {
    let i = 0;
    const iv = setInterval(() => { i++; setMsgIdx(i % LOADING_MSGS.length); }, 1600);
    setTimeout(() => clearInterval(iv), 8000);

    onBuscar({ tipo, cidade, finalidade, preco, quartos, area, diferenciais: difs, prioridades: prios, obs });
  };

  const sliders = [
    { key: 'p1', label: 'Custo-benefício' },
    { key: 'p2', label: 'Localização' },
    { key: 'p3', label: 'Valorização futura' },
    { key: 'p4', label: 'Infraestrutura' },
  ];

  return (
    <div className="space-y-4">
      {/* Tipo */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Tipo de imóvel</p>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                tipo === t
                  ? 'bg-blue-50 border-blue-400 text-blue-800 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Localização e finalidade */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cidade / bairro</label>
          <input
            type="text"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Ex: Fortaleza, Meireles"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Finalidade</label>
          <select
            value={finalidade}
            onChange={(e) => setFinalidade(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option>Morar</option>
            <option>Investir para alugar</option>
            <option>Revenda futura</option>
          </select>
        </div>
      </div>

      {/* Orçamento e características */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Preço máximo', value: preco, set: setPreco, opts: ['Até R$ 300 mil', 'Até R$ 600 mil', 'Até R$ 1 milhão', 'Acima de R$ 1 milhão'] },
          { label: 'Quartos', value: quartos, set: setQuartos, opts: ['1+', '2+', '3+', '4+'] },
          { label: 'Área mínima', value: area, set: setArea, opts: ['Sem preferência', '40 m²+', '60 m²+', '80 m²+', '100 m²+'] },
        ].map(({ label, value, set, opts }) => (
          <div key={label}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Diferenciais */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">Diferenciais desejados</p>
        <div className="flex flex-wrap gap-2">
          {DIFERENCIAIS.map((d) => (
            <button
              key={d}
              onClick={() => toggleDif(d)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                difs.includes(d)
                  ? 'bg-blue-50 border-blue-400 text-blue-800 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Prioridades */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">O que é mais importante para você?</p>
        <div className="space-y-3">
          {sliders.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
              <input
                type="range" min={1} max={5} step={1}
                value={prios[key]}
                onChange={(e) => setPrios((p) => ({ ...p, [key]: Number(e.target.value) }))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs font-medium text-gray-700 w-4 text-right">{prios[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Observações */}
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        rows={2}
        placeholder="Conte mais sobre o que você busca (opcional)..."
        className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
      />

      {/* Botão */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[.98] disabled:opacity-60 text-white font-medium text-sm rounded-xl transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {LOADING_MSGS[msgIdx]}
          </span>
        ) : (
          'Analisar com LLM e gerar relatório'
        )}
      </button>
    </div>
  );
}

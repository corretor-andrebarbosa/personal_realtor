import React from 'react';
import { Link } from 'react-router-dom';

const RANK_STYLES = {
  1: { ring: 'ring-2 ring-blue-500', badge: 'bg-blue-50 text-blue-800', num: 'bg-blue-50 text-blue-800' },
  2: { ring: '', badge: '', num: 'bg-green-50 text-green-800' },
  3: { ring: '', badge: '', num: 'bg-amber-50 text-amber-800' },
};

const SCORE_LABELS = [
  { key: 'custo-beneficio', label: 'custo-benefício' },
  { key: 'localizacao', label: 'localização' },
  { key: 'valorizacao', label: 'valorização' },
  { key: 'infraestrutura', label: 'infraestrutura' },
];

const FONTE_STYLES = {
  'ZapImóveis':  'bg-orange-50 text-orange-700 border-orange-100',
  'VivaReal':    'bg-purple-50 text-purple-700 border-purple-100',
  'OLX':         'bg-yellow-50 text-yellow-700 border-yellow-100',
  'André Barbosa': 'bg-blue-50 text-blue-700 border-blue-100',
};

export function ResultadoCard({ imovel, rank }) {
  const s = RANK_STYLES[rank] ?? RANK_STYLES[3];
  const temCatalogo = imovel.catalogoId && imovel.catalogoId !== 'null';
  const temUrl = imovel.url && imovel.url !== 'null';
  const fonteStyle = FONTE_STYLES[imovel.fonte] ?? 'bg-gray-50 text-gray-600 border-gray-100';

  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-5 ${s.ring}`}>
      {rank === 1 && (
        <span className={`inline-block text-xs font-medium px-3 py-1 rounded-md mb-3 ${s.badge}`}>
          ✦ melhor custo-benefício
        </span>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${s.num}`}>
            {rank}
          </div>
          <div>
            {temCatalogo ? (
              <Link to={`/properties/${imovel.catalogoId}`} className="text-sm font-medium text-blue-700 hover:underline">
                {imovel.nome}
              </Link>
            ) : temUrl ? (
              <a href={imovel.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                {imovel.nome}
              </a>
            ) : (
              <p className="text-sm font-medium text-gray-900">{imovel.nome}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{imovel.endereco}</p>
            {imovel.fonte && (
              <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded border ${fonteStyle}`}>
                {imovel.fonte}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-blue-700">{imovel.preco}</p>
          <p className="text-xs text-gray-400">{imovel.precoM2}</p>
        </div>
      </div>

      {/* Destaques */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {imovel.destaques?.map((d) => (
          <span key={d} className="text-xs px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-500">
            {d}
          </span>
        ))}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {SCORE_LABELS.map(({ key, label }) => (
          <div key={key} className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-base font-medium text-gray-800">{imovel.scores?.[key]}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Análise */}
      <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-3 mb-4">
        {imovel.analise}
      </p>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        {temCatalogo ? (
          <>
            <Link
              to={`/properties/${imovel.catalogoId}`}
              className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver anúncio e contato →
            </Link>
          </>
        ) : temUrl ? (
          <a
            href={imovel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver anúncio e contato →
          </a>
        ) : (
          <a
            href="https://andrebarbosaimoveis.com/#imoveis"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Ver catálogo completo
          </a>
        )}
      </div>
    </div>
  );
}

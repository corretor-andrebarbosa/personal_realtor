import React from 'react';
import { Link } from 'react-router-dom';
import { FormBusca } from '../components/busca/FormBusca';
import { ResultadoCard } from '../components/busca/ResultadoCard';
import { useBuscaImoveis } from '../hooks/useBuscaImoveis';
import { getWhatsAppUrl } from '../whatsapp';

export default function BuscaInteligente() {
  const { status, imoveis, erro, buscar, resetar } = useBuscaImoveis();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-block">
            ← André Barbosa Imóveis
          </Link>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">
            LLM
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Buscador inteligente
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Descreva o que você procura e o LLM gera um relatório personalizado
            com as melhores opções para o seu perfil.
          </p>
        </div>

        {/* Formulário — mantido montado durante idle/loading/error para preservar estado */}
        {status !== 'success' && (
          <>
            <FormBusca onBuscar={buscar} loading={status === 'loading'} />
            {status === 'error' && erro && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                {erro}
              </div>
            )}
          </>
        )}

        {/* Resultados */}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">
                Relatório de melhores opções
              </h2>
              <span className="text-xs text-gray-400">
                {imoveis.length} opções · {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            {imoveis.map((im, i) => (
              <ResultadoCard
                key={im.nome + i}
                imovel={im}
                rank={i + 1}
              />
            ))}

            <div className="flex gap-3 pt-2">
              <button
                onClick={resetar}
                className="text-sm px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
              >
                Nova consulta
              </button>
              <a
                href={getWhatsAppUrl('Olá! Quero falar sobre o relatório de imóveis gerado pelo buscador inteligente.')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                Falar com corretor
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

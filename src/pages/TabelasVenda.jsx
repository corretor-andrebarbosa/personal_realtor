import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Eye, Trash2, Search, Building2, AlertCircle, TableProperties } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BUCKET = 'sales-tables';
const SUPABASE_PROJECT = 'kavjusgxohdpvkeknyjz';

const SETUP_SQL = `-- 1. Colunas na tabela properties
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sales_table_url       text,
  ADD COLUMN IF NOT EXISTS sales_table_filename  text,
  ADD COLUMN IF NOT EXISTS sales_table_updated_at timestamptz;

-- 2. Crie o bucket "sales-tables" no dashboard:
-- Storage → New bucket → Name: sales-tables → Public: OFF`;

function timeAgo(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PropertyRow({ property, uploading, onUpload, onView, onDelete }) {
  const inputRef = useRef(null);
  const has = !!property.sales_table_url;

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3 hover:border-slate-200 transition-colors">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
        {property.image
          ? <img src={property.image} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Building2 size={18} className="text-slate-300" /></div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{property.title || '(sem título)'}</p>
        <p className="text-xs text-slate-400 truncate">
          {[property.type, property.address?.split(',')[0]].filter(Boolean).join(' · ')}
        </p>
        {has ? (
          <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
            <FileText size={10} />
            {property.sales_table_filename}
            <span className="text-slate-400">· {timeAgo(property.sales_table_updated_at)}</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-300 mt-0.5">Sem tabela</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {has && (
          <>
            <button
              onClick={() => onView(property)}
              className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
              title="Abrir PDF"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={() => onDelete(property)}
              className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
              title="Remover tabela"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            uploading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : has
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-[var(--primary-color)] text-white hover:opacity-90'
          }`}
        >
          {uploading
            ? <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            : <Upload size={13} />
          }
          {uploading ? 'Enviando…' : has ? 'Atualizar' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onUpload(property, f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export default function TabelasVenda() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [uploading, setUploading]   = useState({});
  const [needsSetup, setNeedsSetup] = useState(false);
  const [toast, setToast]           = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, type, address, image, sales_table_url, sales_table_filename, sales_table_updated_at')
      .order('title');

    if (error?.message?.includes('column')) {
      setNeedsSetup(true);
      // Load without sales table columns
      const { data: basic } = await supabase
        .from('properties')
        .select('id, title, type, address, image')
        .order('title');
      setProperties(basic || []);
    } else {
      setProperties(data || []);
    }
    setLoading(false);
  }

  async function handleUpload(property, file) {
    if (file.type !== 'application/pdf') {
      showToast('Apenas arquivos PDF são aceitos.', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Arquivo muito grande. Máximo 15MB.', 'error');
      return;
    }

    setUploading(p => ({ ...p, [property.id]: true }));

    const path = `${property.id}/tabela.pdf`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });

    if (upErr) {
      showToast(`Erro no upload: ${upErr.message}`, 'error');
      setUploading(p => ({ ...p, [property.id]: false }));
      return;
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabase.from('properties').update({
      sales_table_url:        path,
      sales_table_filename:   file.name,
      sales_table_updated_at: now,
    }).eq('id', property.id);

    if (updErr) {
      showToast(`Upload feito, mas erro ao salvar: ${updErr.message}`, 'error');
    } else {
      setProperties(prev => prev.map(p => p.id === property.id
        ? { ...p, sales_table_url: path, sales_table_filename: file.name, sales_table_updated_at: now }
        : p
      ));
      showToast(`Tabela de "${property.title}" atualizada!`);
    }
    setUploading(p => ({ ...p, [property.id]: false }));
  }

  async function handleView(property) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(property.sales_table_url, 3600);
    if (error) { showToast('Erro ao abrir PDF: ' + error.message, 'error'); return; }
    window.open(data.signedUrl, '_blank');
  }

  async function handleDelete(property) {
    if (!window.confirm(`Remover tabela de "${property.title}"?`)) return;
    await supabase.storage.from(BUCKET).remove([property.sales_table_url]);
    await supabase.from('properties').update({
      sales_table_url: null, sales_table_filename: null, sales_table_updated_at: null,
    }).eq('id', property.id);
    setProperties(prev => prev.map(p => p.id === property.id
      ? { ...p, sales_table_url: null, sales_table_filename: null, sales_table_updated_at: null }
      : p
    ));
    showToast('Tabela removida.');
  }

  const withTable    = properties.filter(p => p.sales_table_url);
  const withoutTable = properties.filter(p => !p.sales_table_url);

  const filtered = properties.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q)
      || p.type?.toLowerCase().includes(q)
      || p.address?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <TableProperties size={22} className="text-[var(--primary-color)]" />
          <h1 className="text-xl font-bold text-slate-800">Tabelas de Venda</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">PDFs de tabelas por imóvel · visível apenas no admin</p>

        {/* Setup instructions */}
        {needsSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={15} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Setup necessário (uma vez só)</span>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              Execute no{' '}
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql/new`}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Supabase SQL Editor
              </a>{' '}
              e crie o bucket no{' '}
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/storage/buckets`}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Storage
              </a>:
            </p>
            <pre className="bg-amber-100 text-amber-900 text-[10px] p-3 rounded-lg overflow-auto whitespace-pre-wrap">
              {SETUP_SQL}
            </pre>
            <button
              onClick={load}
              className="mt-3 text-xs font-semibold text-amber-700 underline"
            >
              Clique aqui após executar o SQL
            </button>
          </div>
        )}

        {/* Stats */}
        {!loading && !needsSetup && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{withTable.length}</p>
              <p className="text-xs text-slate-400">Com tabela</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
              <p className="text-2xl font-bold text-slate-400">{withoutTable.length}</p>
              <p className="text-xs text-slate-400">Sem tabela</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, tipo ou bairro…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <PropertyRow
                key={p.id}
                property={p}
                uploading={!!uploading[p.id]}
                onUpload={handleUpload}
                onView={handleView}
                onDelete={handleDelete}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhum imóvel encontrado</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

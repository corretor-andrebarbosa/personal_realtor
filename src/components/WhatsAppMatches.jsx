import React, { useEffect, useState } from 'react';
import { MessageCircle, Phone, ChevronDown, ChevronUp, CheckCheck, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function fmtPrice(p) {
  if (!p || p === 0) return null;
  if (p >= 1e6) return `R$ ${(p / 1e6).toFixed(2).replace('.', ',')}M`;
  if (p >= 1e3) return `R$ ${(p / 1e3).toFixed(0)}k`;
  return `R$ ${p.toLocaleString('pt-BR')}`;
}

function MatchCard({ match, onRead }) {
  const [open, setOpen] = useState(false);
  const phone = match.sender_phone?.replace(/\D/g, '') || '';

  return (
    <div className={`rounded-xl border transition-colors ${match.read ? 'border-slate-100 bg-slate-50' : 'border-green-200 bg-green-50'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${match.read ? 'bg-slate-300' : 'bg-green-500'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">{match.sender_name}</p>
          <p className="text-xs text-slate-500 truncate">{match.group_name} · {timeAgo(match.created_at)}</p>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{match.message}</p>
        </div>
        <span className="text-slate-400 shrink-0">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
          {/* Imóveis compatíveis */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Imóveis compatíveis</p>
            {(match.matched_properties || []).map(p => {
              const price = fmtPrice(p.sale_price || p.price) || fmtPrice(p.rental_price) || '–';
              const addr  = (p.address || '').split(',')[0].trim();
              return (
                <a
                  key={p.id}
                  href={`/properties/${p.id}`}
                  className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100 hover:border-[var(--primary-color)] transition-colors"
                >
                  <span className="text-xs text-slate-700 truncate">{p.type || 'Imóvel'}{addr ? ` — ${addr}` : ''}</span>
                  <span className="text-xs font-semibold text-[var(--primary-color)] whitespace-nowrap flex items-center gap-1">
                    {price} <ExternalLink size={10} />
                  </span>
                </a>
              );
            })}
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            {phone && (
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Phone size={12} /> Contatar
              </a>
            )}
            {!match.read && (
              <button
                onClick={() => onRead(match.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <CheckCheck size={12} /> Marcar como lido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppMatches() {
  const [matches, setMatches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);

  const unread = matches.filter(m => !m.read).length;

  useEffect(() => {
    let channel;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('whatsapp_matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setMatches(data || []);
      setLoading(false);
    }

    load();

    // Realtime: novos matches aparecem automaticamente
    channel = supabase
      .channel('whatsapp_matches_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_matches' }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function markRead(id) {
    await supabase.from('whatsapp_matches').update({ read: true }).eq('id', id);
    setMatches(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }

  async function markAllRead() {
    const ids = matches.filter(m => !m.read).map(m => m.id);
    if (!ids.length) return;
    await supabase.from('whatsapp_matches').update({ read: true }).in('id', ids);
    setMatches(prev => prev.map(m => ({ ...m, read: true })));
  }

  if (!loading && matches.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 font-bold text-slate-800"
        >
          <MessageCircle size={18} className="text-green-500" />
          Matches WhatsApp
          {unread > 0 && (
            <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unread}
            </span>
          )}
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </button>
        {expanded && unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Marcar todos como lidos
          </button>
        )}
      </div>

      {expanded && (
        loading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {matches.map(m => <MatchCard key={m.id} match={m} onRead={markRead} />)}
          </div>
        )
      )}
    </div>
  );
}

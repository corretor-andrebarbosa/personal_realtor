import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart2, Globe, Smartphone, Monitor, Tablet, ArrowUpRight, Users } from 'lucide-react';

const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

const FLAG = (cc) => cc
  ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E0 - 65 + c.charCodeAt(0)))
  : '🌍';

export default function AdminAnalytics() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString();
    setLoading(true);
    supabase
      .from('visits')
      .select('page, referrer, country, device, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        setVisits(data || []);
        setLoading(false);
      });
  }, [range]);

  const total = visits.length;

  const topPages = Object.entries(
    visits.reduce((acc, v) => { acc[v.page] = (acc[v.page] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const topReferrers = Object.entries(
    visits
      .filter(v => v.referrer)
      .reduce((acc, v) => {
        try {
          const host = new URL(v.referrer).hostname.replace('www.', '');
          acc[host] = (acc[host] || 0) + 1;
        } catch { acc[v.referrer] = (acc[v.referrer] || 0) + 1; }
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byCountry = Object.entries(
    visits.filter(v => v.country).reduce((acc, v) => { acc[v.country] = (acc[v.country] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byDevice = Object.entries(
    visits.filter(v => v.device).reduce((acc, v) => { acc[v.device] = (acc[v.device] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  // Visitas por dia
  const byDay = visits.reduce((acc, v) => {
    const day = v.created_at?.slice(0, 10);
    if (day) acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  const dayKeys = Object.keys(byDay).sort().slice(-14);
  const maxDay = Math.max(...dayKeys.map(d => byDay[d]), 1);

  const pct = (n) => total ? Math.round((n / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-['Manrope']">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
              <BarChart2 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Analytics</h1>
              <p className="text-xs text-slate-400">Visitas ao site público</p>
            </div>
          </div>
          <select
            value={range}
            onChange={e => setRange(Number(e.target.value))}
            className="text-sm font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Totais */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total de visitas</p>
                <p className="text-3xl font-extrabold text-slate-900">{total.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Países únicos</p>
                <p className="text-3xl font-extrabold text-slate-900">{new Set(visits.map(v => v.country).filter(Boolean)).size}</p>
              </div>
            </div>

            {/* Gráfico de barras por dia */}
            {dayKeys.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Visitas por dia (últimos 14 dias)</p>
                <div className="flex items-end gap-1.5 h-24">
                  {dayKeys.map(day => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-blue-500 rounded-t-md"
                        style={{ height: `${Math.max(4, (byDay[day] / maxDay) * 80)}px` }}
                        title={`${day}: ${byDay[day]} visitas`}
                      />
                      <span className="text-[9px] text-slate-300 rotate-45 origin-left whitespace-nowrap">{day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Top páginas */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Páginas mais visitadas</p>
                <div className="space-y-2">
                  {topPages.map(([page, count]) => (
                    <div key={page} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{page || '/'}</p>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct(count)}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Origens */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Origens (referrers)</p>
                {topReferrers.length === 0 ? (
                  <p className="text-sm text-slate-400">Acesso direto ou sem referrer</p>
                ) : (
                  <div className="space-y-2">
                    {topReferrers.map(([ref, count]) => (
                      <div key={ref} className="flex items-center gap-2">
                        <ArrowUpRight size={14} className="text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{ref}</p>
                          <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct(count)}%` }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-500 shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Países */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Globe size={14} /> Países</p>
                <div className="space-y-2">
                  {byCountry.map(([cc, count]) => (
                    <div key={cc} className="flex items-center gap-2">
                      <span className="text-lg leading-none">{FLAG(cc)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct(count)}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-500 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispositivos */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14} /> Dispositivos</p>
                <div className="space-y-3">
                  {byDevice.map(([device, count]) => {
                    const Icon = DEVICE_ICON[device] || Monitor;
                    return (
                      <div key={device} className="flex items-center gap-3">
                        <Icon size={18} className="text-slate-400 shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-700 capitalize">{device}</span>
                            <span className="text-xs font-bold text-slate-500">{pct(count)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full">
                            <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct(count)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

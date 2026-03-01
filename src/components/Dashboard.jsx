
import React, { useState, useEffect } from 'react';
import {
    DollarSign,
    Users,
    Building2,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    Globe,
    PlusCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { useProperties } from '../contexts/PropertyContext';

import { useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { systemConfig } from '../system-config';
import { supabase } from '../lib/supabaseClient';

const Dashboard = () => {
    const navigate = useNavigate();
    const [context, setContext] = useState('venda');
    const { properties } = useProperties();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = async () => {
        try {
            if (supabase) {
                await supabase.auth.signOut();
            }
        } catch (error) {
            console.error("Logout error:", error);
        }

        localStorage.removeItem('authToken');
        localStorage.removeItem('ab-auth-session');
        navigate('/login');
    };

    // Load primary color from settings
    useEffect(() => {
        const savedColor = localStorage.getItem('ab-primary-color');
        if (savedColor) {
            document.documentElement.style.setProperty('--primary-color', savedColor);
        }
    }, []);

    const vendaProperties = properties.filter(p => p.contract === 'venda');
    const locacaoProperties = properties.filter(p => p.contract === 'locacao');

    const stats = {
        venda: {
            sales: 'R$ 650.000',
            salesGoal: 1000000,
            leads: 24,
            properties: vendaProperties.length,
            commissions: 'R$ 27k',
            funnel: [
                { name: 'Prospecção', value: 145, color: '#93c5fd' },
                { name: 'Visita', value: 42, color: '#60a5fa' },
                { name: 'Proposta', value: 12, color: '#3b82f6' },
                { name: 'Fechado', value: 4, color: '#166b9c' },
            ]
        },
        locacao: {
            sales: 'R$ 15.000',
            salesGoal: 25000,
            leads: 18,
            properties: locacaoProperties.length,
            commissions: 'R$ 4.2k',
            funnel: [
                { name: 'Prospecção', value: 80, color: '#93c5fd' },
                { name: 'Visita', value: 25, color: '#60a5fa' },
                { name: 'Proposta', value: 8, color: '#3b82f6' },
                { name: 'Fechado', value: 6, color: '#166b9c' },
            ]
        }
    };

    const currentStats = stats[context];
    const progressPercentage = (parseInt(currentStats.sales.replace(/\D/g, '')) / currentStats.salesGoal) * 100;

    return (
        <div className="pb-20 bg-slate-50 min-h-screen">
            {/* Header with Context Selector */}
            <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Olá, Corretor!</h1>
                        <p className="text-sm text-slate-500">Veja seu progresso de hoje.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to="/website" className="text-[var(--primary-color)] p-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="Ver Site">
                            <Globe size={18} />
                        </Link>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] transition-all active:scale-95"
                            >
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(systemConfig.brokerName)}&background=0D8ABC&color=fff`} alt="Profile" />
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="px-4 py-3 border-b border-slate-50">
                                        <p className="text-sm font-bold text-slate-800">{systemConfig.brokerName}</p>
                                        <p className="text-xs text-slate-500">Corretor de Imóveis</p>
                                    </div>
                                    <div className="py-1">
                                        <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                            <SettingsIcon size={16} /> Configurações
                                        </Link>
                                        <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                            <User size={16} /> Minha Conta
                                        </Link>
                                    </div>
                                    <div className="border-t border-slate-50 mt-1 py-1">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                        >
                                            <LogOut size={16} /> Sair do Sistema
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mb-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex shadow-inner">
                        <button
                            onClick={() => setContext('venda')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${context === 'venda'
                                ? 'bg-white text-[var(--primary-color)] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Venda
                        </button>
                        <button
                            onClick={() => setContext('locacao')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${context === 'locacao'
                                ? 'bg-white text-[var(--primary-color)] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Locação
                        </button>
                    </div>
                </div>
            </header>

            <div className="p-4 space-y-6 max-w-lg mx-auto">

                {/* Quick Actions */}
                <div className="flex gap-3">
                    <Link to="/properties/new" className="flex-1 bg-[var(--primary-color)] text-white p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all">
                        <PlusCircle size={18} /> Novo Imóvel
                    </Link>
                    <Link to="/leads" className="flex-1 bg-white text-slate-700 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all">
                        <Users size={18} /> Leads
                    </Link>
                    <Link to="/kaleb" className="flex-1 bg-purple-50 text-purple-700 p-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-purple-200 hover:bg-purple-100 transition-all">
                        🤖 Kaleb
                    </Link>
                </div>

                {/* Goal Progress Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vendas Mensais</p>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{currentStats.sales} <span className="text-sm font-normal text-slate-400">/ {(currentStats.salesGoal / 1000).toFixed(0)}k</span></h2>
                        </div>
                        <div className="text-[var(--primary-color)] font-bold bg-blue-50 px-2 py-1 rounded text-sm">
                            {progressPercentage.toFixed(0)}%
                        </div>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="h-full bg-[var(--primary-color)] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded">
                        <TrendingUp size={14} />
                        Faltam R$ {(currentStats.salesGoal - parseInt(currentStats.sales.replace(/\D/g, ''))).toLocaleString('pt-BR')} para bater sua meta
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <Link to="/leads" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-slate-400 bg-slate-50 p-2 rounded-lg"><Users size={20} /></div>
                            <span className="text-xs font-bold text-red-500 flex items-center bg-red-50 px-1 rounded">-5% <ArrowDownRight size={12} /></span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{currentStats.leads}</p>
                            <p className="text-xs text-slate-500 font-medium">Leads Ativos</p>
                        </div>
                    </Link>

                    <Link to="/properties" className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-slate-400 bg-slate-50 p-2 rounded-lg"><Building2 size={20} /></div>
                            <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-50 px-1 rounded">+12% <ArrowUpRight size={12} /></span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{currentStats.properties}</p>
                            <p className="text-xs text-slate-500 font-medium">Imóveis</p>
                        </div>
                    </Link>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between col-span-2">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-slate-400 bg-slate-50 p-2 rounded-lg"><DollarSign size={20} /></div>
                            <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-50 px-1 rounded">+8% <ArrowUpRight size={12} /></span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{currentStats.commissions}</p>
                            <p className="text-xs text-slate-500 font-medium">Comissões Previstas</p>
                        </div>
                    </div>
                </div>

                {/* Sales Funnel */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Target size={18} className="text-[var(--primary-color)]" /> Funil de Vendas
                        </h3>
                        <Link to="/leads" className="text-[var(--primary-color)] text-xs font-bold bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">Detalhar</Link>
                    </div>

                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={currentStats.funnel} barSize={24}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#64748b' }} interval={0} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {currentStats.funnel.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;

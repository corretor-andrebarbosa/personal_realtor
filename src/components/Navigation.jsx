
import React from 'react';
import { Home, Building2, Users, UserCircle, Settings, BookOpen, Search, TableProperties, Handshake, BarChart2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Navigation = () => {
    const navItems = [
        { icon: Home, label: 'Home', path: '/admin' },
        { icon: Building2, label: 'Imóveis', path: '/properties' },
        { icon: Users, label: 'Leads', path: '/leads' },
        { icon: UserCircle, label: 'Pessoas', path: '/people' },
        { icon: BarChart2, label: 'Analytics', path: '/admin/analytics' },
        { icon: TableProperties, label: 'Tabelas', path: '/admin/tabelas' },
        { icon: Search, label: 'Buscador', path: '/busca-inteligente' },
        { icon: BookOpen, label: 'Blog', path: '/admin/blog' },
        { icon: Handshake, label: 'Parceiros', path: '/admin/parceiros' },
        { icon: Settings, label: 'Config', path: '/settings' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg pb-safe z-30">
            <div className="flex overflow-x-auto scrollbar-none items-center h-16 px-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center shrink-0 min-w-[64px] h-full space-y-1 text-xs font-medium transition-colors px-1 ${isActive ? 'text-[var(--primary-color)]' : 'text-gray-400 hover:text-gray-600'
                            }`
                        }
                    >
                        <item.icon size={20} strokeWidth={2} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default Navigation;

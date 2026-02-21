
import React from 'react';
import { Home, Building2, Users, UserCircle, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const Navigation = () => {
    const navItems = [
        { icon: Home, label: 'Home', path: '/admin' },
        { icon: Building2, label: 'Imóveis', path: '/properties' },
        { icon: Users, label: 'Leads', path: '/leads' },
        { icon: UserCircle, label: 'Pessoas', path: '/people' },
        { icon: Settings, label: 'Config', path: '/settings' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg pb-safe z-30">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors ${isActive ? 'text-[var(--primary-color)]' : 'text-gray-400 hover:text-gray-600'
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

import React from 'react';
import { Routes, Route, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import PropertyList from './components/PropertyList';
import PropertyForm from './components/PropertyForm';
import PropertyDetails from './components/PropertyDetails';
import LLMAssistant from './components/LLMAssistant';
import Leads from './components/Leads';
import People from './components/People';
import Settings from './components/Settings';
import PublicHome from './components/public/Home';
import Login from './components/Login';
import { PropertyProvider } from './contexts/PropertyContext';
import { LeadProvider } from './contexts/LeadContext';
import ErrorBoundary from './components/ErrorBoundary';

import { config } from './config';
import Maintenance from './components/public/Maintenance';
import { supabase } from './lib/supabaseClient';

const App = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // ✅ Se tiver ?preview=true na URL, ignoramos a manutenção
    const isPreviewMode = searchParams.get('preview') === 'true';

    // isLoading=true impede redirect prematuro enquanto o Supabase verifica a sessão
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    const _syncLocalSession = (session) => {
        if (session) {
            localStorage.setItem('ab-auth-session', JSON.stringify({ timestamp: Date.now() }));
            localStorage.setItem('authToken', session.access_token);
        } else {
            localStorage.removeItem('ab-auth-session');
            localStorage.removeItem('authToken');
        }
    };

    React.useEffect(() => {
        // 1) Verifica sessão atual no Supabase (resolvida antes de qualquer redirect)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAuthenticated(!!session);
            _syncLocalSession(session || null);
            setIsLoading(false);
        });

        // 2) Subscription criada UMA VEZ (não a cada mudança de pathname)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                setIsAuthenticated(true);
                _syncLocalSession(session);
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                _syncLocalSession(null);
            } else if (event === 'INITIAL_SESSION') {
                setIsAuthenticated(!!session);
                _syncLocalSession(session || null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []); // ← sem dependência de pathname: subscription vive durante toda a sessão


    const adminPrefixes = ['/admin', '/kaleb', '/leads', '/people', '/settings'];

    const isAdminPropertyRoute =
        location.pathname === '/properties' ||
        location.pathname.startsWith('/properties/new') ||
        location.pathname.startsWith('/properties/edit');

    const isAdminPath =
        adminPrefixes.some((p) => location.pathname.startsWith(p)) ||
        isAdminPropertyRoute;

    // Enquanto aguarda verificação de sessão, não redireciona (evita race condition)
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAdminPath && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const hideNavPaths = ['/properties/new', '/website', '/login'];
    const showNav = isAuthenticated
        && location.pathname !== '/'
        && !hideNavPaths.some(p => location.pathname.includes(p))
        && !location.pathname.match(/\/properties\/\d+/)
        && !location.pathname.includes('/properties/edit/');

    return (
        <ErrorBoundary>
            <PropertyProvider>
                <LeadProvider>
                    <div className="font-['Manrope'] antialiased text-slate-900 bg-slate-50 min-h-screen">
                        <Routes>
                            {/* Public routes */}
                            <Route
                                path="/"
                                element={
                                    // ✅ LÓGICA DO PREVIEW
                                    (config.maintenance.enabled && !isPreviewMode) 
                                        ? <Maintenance expectedReturnDate={config.maintenance.returnDate} /> 
                                        : <PublicHome />
                                }
                            />
                            <Route path="/website" element={<Navigate to="/" replace />} />
                            <Route path="/login" element={<Login />} />

                            {/* Admin routes */}
                            <Route path="/admin" element={<Dashboard />} />
                            <Route path="/properties" element={<PropertyList />} />
                            <Route path="/properties/new" element={<PropertyForm />} />
                            <Route path="/properties/edit/:id" element={<PropertyForm />} />
                            <Route path="/properties/:id" element={<PropertyDetails />} />
                            <Route path="/kaleb" element={<LLMAssistant />} />
                            <Route path="/leads" element={<Leads />} />
                            <Route path="/people" element={<People />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>

                        {showNav && <Navigation />}
                    </div>
                </LeadProvider>
            </PropertyProvider>
        </ErrorBoundary>
    );
};

export default App;
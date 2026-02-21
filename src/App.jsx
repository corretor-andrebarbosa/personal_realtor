
import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

const App = () => {
    const location = useLocation();

    // Auth and Session logic (30 minutes expiry)
    const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
        const sessionStr = localStorage.getItem('ab-auth-session');
        if (!sessionStr) return false;
        try {
            const session = JSON.parse(sessionStr);
            return (Date.now() - session.timestamp < 30 * 60 * 1000);
        } catch (e) { return false; }
    });

    React.useEffect(() => {
        const checkAuth = () => {
            const sessionStr = localStorage.getItem('ab-auth-session');
            if (!sessionStr) {
                setIsAuthenticated(false);
                return;
            }

            try {
                const session = JSON.parse(sessionStr);
                const now = Date.now();
                const thirtyMinutes = 30 * 60 * 1000;

                if (now - session.timestamp > thirtyMinutes) {
                    localStorage.removeItem('ab-auth-session');
                    localStorage.removeItem('authToken');
                    setIsAuthenticated(false);
                } else {
                    // Update timestamp to extend session
                    const updatedSession = { ...session, timestamp: now };
                    localStorage.setItem('ab-auth-session', JSON.stringify(updatedSession));
                    setIsAuthenticated(true);
                }
            } catch (e) {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, [location.pathname]);

    // Redirect to login if trying to access admin pages while unauthenticated
    const isAdminPath = ['/admin', '/properties', '/kaleb', '/leads', '/people', '/settings'].some(path => location.pathname.startsWith(path));
    if (isAdminPath && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Hide bottom nav on specific pages
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
                                element={config.maintenance.enabled ? <Maintenance expectedReturnDate={config.maintenance.returnDate} /> : <PublicHome />}
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

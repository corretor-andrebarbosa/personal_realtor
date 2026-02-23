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

    // Se tiver ?preview=true na URL, ignoramos a manutenção
    const isPreviewMode = searchParams.get('preview') === 'true';

    const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
        const sessionStr = localStorage.getItem('ab-auth-session');
        if (!sessionStr) return false;
        try {
            const session = JSON.parse(sessionStr);
            return (Date.now() - session.timestamp < 30 * 60 * 1000);
        } catch (e) { return false; }
    });

    React.useEffect(() => {
        const checkLocalSession = () => {
            const sessionStr = localStorage.getItem('ab-auth-session');
            if (!sessionStr) { setIsAuthenticated(false); return; }
            try {
                const session = JSON.parse(sessionStr);
                const now = Date.now();
                if (now - session.timestamp > 30 * 60 * 1000) {
                    localStorage.removeItem('ab-auth-session');
                    localStorage.removeItem('authToken');
                    setIsAuthenticated(false);
                } else {
                    localStorage.setItem('ab-auth-session', JSON.stringify({ ...session, timestamp: now }));
                    setIsAuthenticated(true);
                }
            } catch (e) { setIsAuthenticated(false); }
        };
        checkLocalSession();

        const { data: { subscription } } = supabase.auth
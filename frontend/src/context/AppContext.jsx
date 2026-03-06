import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);
    const [vertical, setVertical] = useState(null);

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const t = useCallback((key, fallback) => {
        if (!vertical?.terminology) return fallback;
        return vertical.terminology[key] || fallback;
    }, [vertical]);

    const fetchVertical = useCallback(async () => {
        try {
            const json = await api.get('/verticals/active');
            setVertical(json.data);
        } catch (err) {
            console.error('Failed to fetch vertical:', err);
        }
    }, []);

    const fetchDashboard = useCallback(async (filters = {}) => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (filters.department) params.set('department', filters.department);
            if (filters.facility) params.set('facility', filters.facility);
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate) params.set('endDate', filters.endDate);
            const qs = params.toString();
            const json = await api.get(`/dashboard${qs ? `?${qs}` : ''}`);
            setData(json.data);
            if (json.data.newAlerts?.length) {
                setAlerts(prev => [...json.data.newAlerts, ...prev]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const json = await api.get('/alerts');
            setAlerts(json.data);
            setStatus(json.status);
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        }
    }, []);

    const acknowledgeAlert = useCallback(async (alertId) => {
        try {
            await api.post(`/alerts/${alertId}/acknowledge`);
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    }, []);

    const simulateAnomaly = useCallback(async (scope = 'scope1', multiplier = 1.5) => {
        try {
            const json = await api.post('/audit/simulate-anomaly', { scope, multiplier });
            if (json.alerts) {
                setAlerts(prev => [...json.alerts, ...prev]);
                setStatus(json.status);
            }
            return json;
        } catch (err) {
            console.error('Anomaly simulation failed:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        fetchVertical();
        fetchDashboard();
        fetchAlerts();
    }, [fetchVertical, fetchDashboard, fetchAlerts]);

    const value = {
        data, alerts, loading, error, status, vertical, theme,
        t, toggleTheme,
        fetchVertical, fetchDashboard, fetchAlerts,
        acknowledgeAlert, simulateAnomaly,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

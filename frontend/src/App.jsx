import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Auditor from './pages/Auditor';
import Reports from './pages/Reports';
import DataManager from './pages/DataManager';
import Simulator from './pages/Simulator';
import { useLocation } from 'react-router-dom';

const API_BASE = '/api';

export default function App() {
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);

    // Theme State defaults to dark
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/dashboard`);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
                if (json.data.newAlerts?.length) {
                    setAlerts(prev => [...json.data.newAlerts, ...prev]);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/alerts`);
            const json = await res.json();
            if (json.success) {
                setAlerts(json.data);
                setStatus(json.status);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        }
    }, []);

    const acknowledgeAlert = useCallback(async (alertId) => {
        try {
            await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    }, []);

    const simulateAnomaly = useCallback(async (scope = 'scope1', multiplier = 1.5) => {
        try {
            const res = await fetch(`${API_BASE}/audit/simulate-anomaly`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scope, multiplier }),
            });
            const json = await res.json();
            if (json.success && json.alerts) {
                setAlerts(prev => [...json.alerts, ...prev]);
                setStatus(json.status);
            }
            return json;
        } catch (err) {
            console.error('Anomaly simulation failed:', err);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        fetchAlerts();
    }, [fetchDashboard, fetchAlerts]);

    const unresolvedCount = alerts.filter(a => !a.acknowledged).length;

    return (
        <BrowserRouter>
            <div className="app-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                            <img src="/logo.png" alt="CarbonLens Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div>
                            <h1 style={{ fontFamily: "'Outfit', sans-serif" }}>CarbonLens</h1>
                            <span>ESG Audit Agent</span>
                        </div>
                    </div>

                    <nav className="sidebar-nav">
                        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                            Dashboard
                        </NavLink>

                        <NavLink to="/data" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                            Data Manager
                        </NavLink>

                        <NavLink to="/simulator" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
                            Simulator
                        </NavLink>

                        <NavLink to="/auditor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            Auditor Agent
                            {unresolvedCount > 0 && <span className="nav-badge">{unresolvedCount}</span>}
                        </NavLink>

                        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                            Reports
                        </NavLink>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="sidebar-status" style={{ marginBottom: '12px' }}>
                            <span className={`status-dot ${error ? 'offline' : ''}`}></span>
                            {error ? 'Connection Error' : 'MCP + SQLite Connected'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={toggleTheme}
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={
                            <Dashboard data={data} loading={loading} error={error} onRefresh={fetchDashboard} />
                        } />
                        <Route path="/data" element={<DataManager />} />
                        <Route path="/simulator" element={<Simulator dashboardData={data} />} />
                        <Route path="/auditor" element={
                            <Auditor
                                alerts={alerts}
                                status={status}
                                onAcknowledge={acknowledgeAlert}
                                onSimulateAnomaly={simulateAnomaly}
                                onRefresh={fetchAlerts}
                            />
                        } />
                        <Route path="/reports" element={<Reports />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

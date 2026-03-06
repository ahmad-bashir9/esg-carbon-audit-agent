import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Dashboard from './pages/Dashboard';
import Auditor from './pages/Auditor';
import Reports from './pages/Reports';
import DataManager from './pages/DataManager';
import Simulator from './pages/Simulator';
import Settings from './pages/Settings';
import Targets from './pages/Targets';
import Suppliers from './pages/Suppliers';
import Integrations from './pages/Integrations';
import Benchmarks from './pages/Benchmarks';
import Login from './pages/Login';
import About from './pages/About';
import ChatPanel from './components/ChatPanel';

function AppShell() {
    const { alerts, error, theme, toggleTheme, t } = useApp();
    const unresolvedCount = alerts.filter(a => !a.acknowledged).length;
    const [chatOpen, setChatOpen] = useState(false);
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-brand-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
                        <img src="/logo.png" alt="CarbonLens Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div>
                        <h1 style={{ fontFamily: "'Outfit', sans-serif" }}>CarbonLens</h1>
                        <span>{t('app.subtitle', 'ESG Audit Agent')}</span>
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
                    <NavLink to="/targets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                        Targets
                    </NavLink>
                    <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                        Suppliers
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
                    <NavLink to="/benchmarks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                        Benchmarks
                    </NavLink>
                    <NavLink to="/integrations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                        Integrations
                    </NavLink>
                    <NavLink to="/about" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                        About
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1V11a2 2 0 01-2-2 2 2 0 012-2v-.09A1.65 1.65 0 005.6 4.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2v.09a1.65 1.65 0 00-1.51 1z" /></svg>
                        Settings
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    {user && user.id !== 'guest' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: 700 }}>
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.role}</div>
                            </div>
                            <button className="btn-ghost" onClick={handleLogout} style={{ padding: '4px', fontSize: '12px' }} title="Sign out">↗</button>
                        </div>
                    )}
                    <div className="sidebar-status" style={{ marginBottom: '12px' }}>
                        <span className={`status-dot ${error ? 'offline' : ''}`}></span>
                        {error ? 'Connection Error' : 'MCP + SQLite Connected'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={toggleTheme}
                            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/data" element={<DataManager />} />
                    <Route path="/targets" element={<Targets />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/simulator" element={<Simulator />} />
                    <Route path="/auditor" element={<Auditor />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/benchmarks" element={<Benchmarks />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/about" element={<About />} />
                </Routes>
            </main>

            {/* AI Chat FAB & Panel */}
            <button className="chat-fab" onClick={() => setChatOpen(prev => !prev)} title="AI Assistant">
                {chatOpen ? '✕' : 'AI'}
            </button>
            <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <AppProvider>
                    <AppShell />
                </AppProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}

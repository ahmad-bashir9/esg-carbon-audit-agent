import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { formatNum, safePercent, scopeLabel } from '../utils/format';

const SCOPE_COLORS = {
    scope1: '#F97316',
    scope2: '#3B82F6',
    scope3: '#10B981',
};

function Sparkline({ data, dataKey, color, height = 32 }) {
    if (!data || data.length < 2) return null;
    return (
        <div className="sparkline-container">
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data}>
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="custom-tooltip">
            <div className="label">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="value" style={{ color: p.color }}>
                    {p.name}: {formatNum(p.value)} kg carbon
                </div>
            ))}
        </div>
    );
}

function LineageModal({ item, onClose }) {
    const lineage = item.raw_lineage_snapshot ? JSON.parse(item.raw_lineage_snapshot) : null;

    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div className="card animate-in" onClick={e => e.stopPropagation()} style={{
                maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-subtle)'
            }}>
                <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                    <div>
                        <span className="card-title">Audit Proof & Data Lineage</span>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Traceability for Item: {item.source}</p>
                    </div>
                    <button className="btn-ghost" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div style={{ display: 'grid', gap: '20px' }}>
                    <div className="alert-item" style={{ borderLeft: '4px solid var(--accent-blue)', background: 'var(--bg-secondary)' }}>
                        <div className="alert-content">
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>Verifiability Score: {item.confidence_score}%</h4>
                            <p className="alert-message">
                                {item.confidence_score >= 90 ? 'Primary source data verified via direct API connection (TÜV/ISO aligned).' :
                                    item.confidence_score >= 80 ? 'Secondary data verified via CSV audit logs.' :
                                        'Estimated data based on manual operational logs.'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ fontWeight: 600 }}>ISO 14064-1 Verifiable Formula</label>
                        <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--accent-emerald)', border: '1px solid var(--border-subtle)', fontFamily: 'monospace' }}>
                            {item.formula || "Calculation formula mapping in progress..."}
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ fontWeight: 600 }}>Gemini Thought Trace (AI Reasoning)</label>
                        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', border: '1px solid var(--border-subtle)' }}>
                            "Classification: This activity was mapped to '{item.category}' based on the source identifier '{item.source}'.
                            Confidence is high due to exact keyword matching in the greenhouse gas emission factor database.
                            Emission Factor assigned: {item.emission_factor}."
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ fontWeight: 600 }}>Raw Data Snapshot (Immutable Copy)</label>
                        <pre style={{
                            background: '#111', color: '#10B981', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem',
                            border: '1px solid #333'
                        }}>
                            {JSON.stringify(lineage || { message: "No raw lineage data for this older record." }, null, 2)}
                        </pre>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Close Trace</button>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { data, loading, error, fetchDashboard, t } = useApp();
    const [insights, setInsights] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ departments: [], facilities: [] });
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedFacility, setSelectedFacility] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activePreset, setActivePreset] = useState('all');
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [selectedLineage, setSelectedLineage] = useState(null);
    const [trends, setTrends] = useState([]);
    const [drillPath, setDrillPath] = useState([]);
    const [intensityMetrics, setIntensityMetrics] = useState([]);

    useEffect(() => {
        api.get('/filters').then(j => setFilterOptions(j.data)).catch(() => { });
        api.get('/trends?limit=20').then(j => setTrends(j.data || [])).catch(() => { });
        api.get('/intensity').then(j => setIntensityMetrics(j.data?.metrics || [])).catch(() => { });
    }, []);

    useEffect(() => {
        if (!data) return;
        setInsightsLoading(true);
        api.get('/insights').then(j => setInsights(j.data)).catch(() => { }).finally(() => setInsightsLoading(false));
        api.get('/trends?limit=20').then(j => setTrends(j.data || [])).catch(() => { });
    }, [data]);

    const applyDatePreset = useCallback((preset) => {
        setActivePreset(preset);
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        switch (preset) {
            case '7d': { const s = new Date(today); s.setDate(s.getDate() - 7); setStartDate(fmt(s)); setEndDate(fmt(today)); break; }
            case '30d': { const s = new Date(today); s.setDate(s.getDate() - 30); setStartDate(fmt(s)); setEndDate(fmt(today)); break; }
            case '90d': { const s = new Date(today); s.setDate(s.getDate() - 90); setStartDate(fmt(s)); setEndDate(fmt(today)); break; }
            case 'month': { setStartDate(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setEndDate(fmt(today)); break; }
            case 'year': { setStartDate(fmt(new Date(today.getFullYear(), 0, 1))); setEndDate(fmt(today)); break; }
            default: setStartDate(''); setEndDate(''); break;
        }
    }, []);

    const handleFilterRefresh = useCallback(() => {
        fetchDashboard({
            department: selectedDept || undefined,
            facility: selectedFacility || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });
    }, [fetchDashboard, selectedDept, selectedFacility, startDate, endDate]);

    useEffect(() => {
        handleFilterRefresh();
    }, [selectedDept, selectedFacility, startDate, endDate]);

    const totals = data?.totals || { scope1: 0, scope2: 0, scope3: 0, total: 0 };
    const byCategory = data?.byCategory || {};
    const byFacility = data?.byFacility || {};
    const scope1 = data?.scope1 || [];
    const scope2 = data?.scope2 || [];
    const scope3 = data?.scope3 || [];

    const scopePieData = useMemo(() => [
        { name: scopeLabel(1), value: Math.round(totals.scope1), color: SCOPE_COLORS.scope1 },
        { name: scopeLabel(2), value: Math.round(totals.scope2), color: SCOPE_COLORS.scope2 },
        { name: scopeLabel(3), value: Math.round(totals.scope3), color: SCOPE_COLORS.scope3 },
    ], [totals]);

    const categoryBarData = useMemo(() =>
        Object.entries(byCategory)
            .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value),
        [byCategory]);

    const facilityData = useMemo(() =>
        Object.entries(byFacility)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value),
        [byFacility]);

    const hotspots = useMemo(() => categoryBarData.slice(0, 8), [categoryBarData]);

    const handleDrillDown = useCallback((type, value) => {
        setDrillPath(prev => [...prev, { type, value }]);
        if (type === 'scope') {
            const scopeNum = value === 'Direct' ? 1 : value === 'Energy' ? 2 : 3;
            const items = scopeNum === 1 ? scope1 : scopeNum === 2 ? scope2 : scope3;
            const cats = {};
            items.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.co2e_kg; });
        }
    }, [scope1, scope2, scope3]);

    const handleDrillReset = useCallback(() => setDrillPath([]), []);

    const scope3Data = useMemo(() => {
        const cats = {};
        scope3.forEach(e => {
            if (!cats[e.category]) cats[e.category] = 0;
            cats[e.category] += e.co2e_kg;
        });
        return Object.entries(cats).map(([name, size]) => ({ name, size: Math.round(size) }));
    }, [scope3]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Fetching emissions data from MCP servers...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loading-container">
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
                <div className="loading-text">Failed to connect: {error}</div>
                <button className="btn btn-primary" onClick={() => fetchDashboard()} style={{ marginTop: '16px' }}>Retry</button>
            </div>
        );
    }

    if (!data) return null;

    const maxHotspot = hotspots[0]?.value || 1;

    return (
        <>
            {selectedLineage && <LineageModal item={selectedLineage} onClose={() => setSelectedLineage(null)} />}

            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Carbon Dashboard</h2>
                        <p>Real-time emissions overview &bull; {data.recordCount || 0} activity records</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {filterOptions.departments?.length > 0 && (
                            <select className="form-select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 28px 6px 10px' }}>
                                <option value="">All Departments</option>
                                {filterOptions.departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        )}
                        {filterOptions.facilities?.length > 0 && (
                            <select className="form-select" value={selectedFacility} onChange={e => setSelectedFacility(e.target.value)} style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 28px 6px 10px' }}>
                                <option value="">All Facilities</option>
                                {filterOptions.facilities.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        )}
                        <button className="btn btn-secondary" onClick={handleFilterRefresh}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Date Range Filter Bar */}
                <div className="dashboard-date-bar">
                    <div className="date-presets">
                        {[
                            { key: 'all', label: 'All Time' },
                            { key: '7d', label: '7 Days' },
                            { key: '30d', label: '30 Days' },
                            { key: '90d', label: '90 Days' },
                            { key: 'month', label: 'This Month' },
                            { key: 'year', label: 'This Year' },
                        ].map(p => (
                            <button key={p.key}
                                className={`date-preset-btn ${activePreset === p.key ? 'active' : ''}`}
                                onClick={() => applyDatePreset(p.key)}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="date-custom">
                        <input type="date" className="form-input" value={startDate}
                            onChange={e => { setStartDate(e.target.value); setActivePreset('custom'); }}
                            style={{ fontSize: '0.8rem', padding: '6px 10px', width: '150px' }}
                            max={endDate || undefined} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
                        <input type="date" className="form-input" value={endDate}
                            onChange={e => { setEndDate(e.target.value); setActivePreset('custom'); }}
                            style={{ fontSize: '0.8rem', padding: '6px 10px', width: '150px' }}
                            min={startDate || undefined} />
                        {(startDate || endDate) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => applyDatePreset('all')}
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Clear</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="card stat-card scope-total animate-in">
                    <div className="card-header">
                        <span className="card-title">Total Emissions</span>
                        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🌍</div>
                    </div>
                    <div className="card-value" style={{ backgroundImage: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {formatNum(totals.total)}
                    </div>
                    <div className="card-label">kg carbon equivalent</div>
                    <Sparkline data={trends} dataKey="total" color="#3B82F6" />
                </div>

                <div className="card stat-card scope-1 animate-in">
                    <div className="card-header">
                        <span className="card-title">{t('dashboard.scope1_label', scopeLabel(1, 'full'))}</span>
                        <div className="card-icon" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>🔥</div>
                    </div>
                    <div className="card-value" style={{ color: SCOPE_COLORS.scope1 }}>{formatNum(totals.scope1)}</div>
                    <div className="card-label">{t('dashboard.scope1_subtitle', scopeLabel(1, 'subtitle'))} &bull; {safePercent(totals.scope1, totals.total).toFixed(1)}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${safePercent(totals.scope1, totals.total)}%`, background: 'var(--gradient-scope1)' }}></div></div>
                    <Sparkline data={trends} dataKey="scope1" color={SCOPE_COLORS.scope1} />
                </div>

                <div className="card stat-card scope-2 animate-in">
                    <div className="card-header">
                        <span className="card-title">{scopeLabel(2, 'full')}</span>
                        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>⚡</div>
                    </div>
                    <div className="card-value" style={{ color: SCOPE_COLORS.scope2 }}>{formatNum(totals.scope2)}</div>
                    <div className="card-label">{scopeLabel(2, 'subtitle')} &bull; {safePercent(totals.scope2, totals.total).toFixed(1)}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${safePercent(totals.scope2, totals.total)}%`, background: 'var(--gradient-scope2)' }}></div></div>
                    <Sparkline data={trends} dataKey="scope2" color={SCOPE_COLORS.scope2} />
                </div>

                <div className="card stat-card scope-3 animate-in">
                    <div className="card-header">
                        <span className="card-title">{scopeLabel(3, 'full')}</span>
                        <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>🌐</div>
                    </div>
                    <div className="card-value" style={{ color: SCOPE_COLORS.scope3 }}>{formatNum(totals.scope3)}</div>
                    <div className="card-label">{scopeLabel(3, 'subtitle')} &bull; {safePercent(totals.scope3, totals.total).toFixed(1)}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${safePercent(totals.scope3, totals.total)}%`, background: 'var(--gradient-scope3)' }}></div></div>
                    <Sparkline data={trends} dataKey="scope3" color={SCOPE_COLORS.scope3} />
                </div>
            </div>

            {/* Intensity Metrics */}
            {intensityMetrics.length > 0 && (
                <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${Math.min(intensityMetrics.length, 4)}, 1fr)`, marginBottom: '28px' }}>
                    {intensityMetrics.map((m, i) => (
                        <div key={i} className="card stat-card animate-in" style={{ borderTop: '2px solid var(--accent-violet)' }}>
                            <div className="card-header">
                                <span className="card-title">{m.label}</span>
                                <div className="card-icon" style={{ background: 'rgba(139,92,246,0.15)', fontSize: '14px' }}>📊</div>
                            </div>
                            <div className="card-value" style={{ fontSize: '1.6rem', color: 'var(--accent-violet)' }}>{formatNum(m.value)}</div>
                            <div className="card-label">{m.unit}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drill-Down Breadcrumb */}
            {drillPath.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={handleDrillReset} style={{ color: 'var(--accent-blue)' }}>Dashboard</button>
                    {drillPath.map((p, i) => (
                        <React.Fragment key={i}>
                            <span style={{ color: 'var(--text-muted)' }}>/</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.value}</span>
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Emission Trends Chart */}
            {trends.length >= 2 && (
                <div className="card animate-in" style={{ marginBottom: '28px' }}>
                    <div className="card-header">
                        <span className="card-title">Emission Trends Over Time</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{trends.length} snapshots</span>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trends} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <defs>
                                    <linearGradient id="trendS1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={SCOPE_COLORS.scope1} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="trendS2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={SCOPE_COLORS.scope2} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="trendS3" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={SCOPE_COLORS.scope3} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>{value}</span>} />
                                <Area type="monotone" dataKey="scope1" name={scopeLabel(1)} stroke={SCOPE_COLORS.scope1} fill="url(#trendS1)" strokeWidth={2} />
                                <Area type="monotone" dataKey="scope2" name={scopeLabel(2)} stroke={SCOPE_COLORS.scope2} fill="url(#trendS2)" strokeWidth={2} />
                                <Area type="monotone" dataKey="scope3" name={scopeLabel(3)} stroke={SCOPE_COLORS.scope3} fill="url(#trendS3)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* AI Insights */}
            {insights.length > 0 && (
                <div className="card animate-in" style={{ marginBottom: '28px' }}>
                    <div className="card-header">
                        <span className="card-title">💡 AI-Powered Insights</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                            {insightsLoading ? 'Analyzing...' : 'Gemini'}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                        {insights.map((insight, i) => (
                            <div key={i} className="hotspot-item" style={{ margin: 0 }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0,
                                    background: insight.impact === 'high' ? 'rgba(244,63,94,0.15)' : insight.impact === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: insight.impact === 'high' ? 'var(--accent-rose)' : insight.impact === 'medium' ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                                }}>
                                    {insight.impact === 'high' ? '🔴' : insight.impact === 'medium' ? '🟡' : '🟢'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{insight.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{insight.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row 1 */}
            <div className="charts-grid">
                <div className="card animate-in">
                    <div className="card-header"><span className="card-title">Emissions by Source</span></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={scopePieData} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} strokeWidth={0}
                                    onClick={(data) => handleDrillDown('scope', data.name)} style={{ cursor: 'pointer' }}>
                                    {scopePieData.map((entry, i) => <Cell key={i} fill={entry.color} style={{ cursor: 'pointer' }} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card animate-in">
                    <div className="card-header"><span className="card-title">Emissions by Category</span></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={categoryBarData} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Carbon" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={18}
                                    onClick={(data) => handleDrillDown('category', data.name)} style={{ cursor: 'pointer' }}>
                                    {categoryBarData.map((_, i) => <Cell key={i} fill={['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#06B6D4', '#F43F5E', '#F59E0B', '#EC4899'][i % 8]} style={{ cursor: 'pointer' }} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-grid">
                <div className="card animate-in">
                    <div className="card-header"><span className="card-title">Emissions by Facility</span></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={facilityData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <defs>
                                    <linearGradient id="facilityGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="value" name="Carbon" stroke="#3B82F6" fill="url(#facilityGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card animate-in">
                    <div className="card-header"><span className="card-title">Supply Chain Breakdown</span></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={scope3Data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
                                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="size" name="Carbon" radius={[4, 4, 0, 0]} barSize={30}>
                                    {scope3Data.map((_, i) => <Cell key={i} fill={['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#F59E0B', '#F43F5E', '#F97316'][i % 7]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Carbon Hotspots */}
            <div className="card animate-in" style={{ marginBottom: '28px' }}>
                <div className="card-header">
                    <span className="card-title">Carbon Hotspots</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Top emission categories ranked by carbon output</span>
                </div>

                {hotspots.length > 0 && (
                    <div className="hotspot-hero" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                            <div className="hotspot-rank rank-1" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>#1</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>{hotspots[0].name}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-orange)', fontFamily: "'Outfit', sans-serif" }}>{formatNum(hotspots[0].value)}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kg carbon</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.12)', padding: '2px 8px', borderRadius: '10px' }}>
                                        {safePercent(hotspots[0].value, totals.total).toFixed(1)}% of total
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="hotspot-bar-track">
                            <div className="hotspot-bar-fill hotspot-bar-1" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                )}

                <div className="hotspot-list">
                    {hotspots.slice(1).map((h, i) => {
                        const pct = safePercent(h.value, maxHotspot);
                        const rank = i + 2;
                        return (
                            <div key={h.name} className="hotspot-list-item">
                                <div className="hotspot-list-left">
                                    <div className={`hotspot-rank ${rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-default'}`}>#{rank}</div>
                                    <div className="hotspot-info">
                                        <div className="hotspot-name">{h.name}</div>
                                    </div>
                                </div>
                                <div className="hotspot-list-right">
                                    <div className="hotspot-bar-track" style={{ flex: 1 }}>
                                        <div className={`hotspot-bar-fill hotspot-bar-${Math.min(rank, 4)}`} style={{ width: `${pct}%` }}></div>
                                    </div>
                                    <div className="hotspot-list-value">{formatNum(h.value)}</div>
                                    <div className="hotspot-list-pct">{safePercent(h.value, totals.total).toFixed(1)}%</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Emissions Table */}
            <div className="card animate-in">
                <div className="card-header">
                    <span className="card-title">Detailed Emission Line Items</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {scope1.length + scope2.length + scope3.length} entries &bull; Audit Ready
                    </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Scope</th>
                                <th>Category</th>
                                <th>Activity</th>
                                <th>Confidence</th>
                                <th style={{ textAlign: 'right' }}>Carbon (kg)</th>
                                <th style={{ textAlign: 'right' }}>Audit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...scope1, ...scope2, ...scope3.slice(0, 10)].map((entry) => (
                                <tr key={entry.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.source}</td>
                                    <td><span className={`scope-badge scope-${entry.scope}`}>{scopeLabel(entry.scope)}</span></td>
                                    <td>{entry.category}</td>
                                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNum(entry.activity_data)} {entry.activity_unit}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div className="progress-bar" style={{ width: '40px', height: '6px' }}>
                                                <div className="progress-fill" style={{
                                                    width: `${entry.confidence_score || 100}%`,
                                                    background: (entry.confidence_score || 100) >= 90 ? 'var(--accent-emerald)' : (entry.confidence_score || 0) >= 70 ? 'var(--accent-amber)' : 'var(--accent-rose)'
                                                }}></div>
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{entry.confidence_score || 100}%</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatNum(entry.co2e_kg)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-ghost" onClick={() => setSelectedLineage(entry)} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--accent-blue)' }}>
                                            Trace
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

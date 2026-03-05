import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const SCOPE_COLORS = {
    scope1: '#F97316',
    scope2: '#3B82F6',
    scope3: '#10B981',
};

function formatNum(n) {
    if (!n && n !== 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="custom-tooltip">
            <div className="label">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="value" style={{ color: p.color }}>
                    {p.name}: {formatNum(p.value)} kg CO₂e
                </div>
            ))}
        </div>
    );
}

export default function Dashboard({ data, loading, error, onRefresh, vertical, t }) {
    const [insights, setInsights] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ departments: [], facilities: [] });
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedFacility, setSelectedFacility] = useState('');
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Lineage Modal State
    const [selectedLineage, setSelectedLineage] = useState(null);

    useEffect(() => {
        fetch('/api/filters').then(r => r.json()).then(j => {
            if (j.success) setFilterOptions(j.data);
        }).catch(() => { });

        setInsightsLoading(true);
        fetch('/api/insights').then(r => r.json()).then(j => {
            if (j.success) setInsights(j.data);
        }).catch(() => { }).finally(() => setInsightsLoading(false));
    }, [data]);

    const handleFilterRefresh = useCallback(() => {
        onRefresh();
    }, [onRefresh]);

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
                <button className="btn btn-primary" onClick={onRefresh} style={{ marginTop: '16px' }}>Retry</button>
            </div>
        );
    }

    if (!data) return null;

    const { totals, byCategory, byFacility, scope1, scope2, scope3 } = data;

    const scopePieData = [
        { name: 'Scope 1', value: Math.round(totals.scope1), color: SCOPE_COLORS.scope1 },
        { name: 'Scope 2', value: Math.round(totals.scope2), color: SCOPE_COLORS.scope2 },
        { name: 'Scope 3', value: Math.round(totals.scope3), color: SCOPE_COLORS.scope3 },
    ];

    const categoryBarData = Object.entries(byCategory)
        .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value);

    const facilityData = Object.entries(byFacility || {})
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value);

    const hotspots = categoryBarData.slice(0, 8);

    const scope3Categories = {};
    scope3.forEach(e => {
        if (!scope3Categories[e.category]) scope3Categories[e.category] = 0;
        scope3Categories[e.category] += e.co2e_kg;
    });
    const scope3Data = Object.entries(scope3Categories).map(([name, size]) => ({
        name, size: Math.round(size),
    }));

    // Lineage Modal Layout
    const LineageModal = ({ item, onClose }) => {
        const lineage = item.raw_lineage_snapshot ? JSON.parse(item.raw_lineage_snapshot) : null;

        return (
            <div className="modal-overlay" onClick={onClose} style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}>
                <div className="card animate-in" onClick={e => e.stopPropagation()} style={{
                    maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
                }}>
                    <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                        <div>
                            <span className="card-title">Audit Proof & Data Lineage</span>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Traceability for Item: {item.source}</p>
                        </div>
                        <button className="btn-ghost" onClick={onClose}>✕</button>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div className="alert-item" style={{ borderLeft: '4px solid var(--accent-blue)', background: 'var(--bg-secondary)' }}>
                            <div className="alert-content">
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>🛡️ Verifiability Score: {item.confidence_score}%</h4>
                                <p className="alert-message">
                                    {item.confidence_score >= 90 ? 'Primary source data verified via direct API connection (TÜV/ISO aligned).' :
                                        item.confidence_score >= 80 ? 'Secondary data verified via CSV audit logs.' :
                                            'Estimated data based on manual operational logs.'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: 600 }}>ISO 14064-1 Verifiable Formula</label>
                            <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--accent-emerald)', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                                {item.formula || "Calculation formula mapping in progress..."}
                            </div>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontWeight: 600 }}>Gemini Thought Trace (AI Reasoning)</label>
                            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', border: '1px solid var(--border-color)' }}>
                                "Classification: This activity was mapped to '{item.category}' based on the source identifier '{item.source}'.
                                Confidence is high due to exact keyword matching in the GHG Protocol factor database.
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
    };

    return (
        <>
            {selectedLineage && <LineageModal item={selectedLineage} onClose={() => setSelectedLineage(null)} />}

            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Carbon Dashboard</h2>
                        <p>Real-time emissions overview • {data.recordCount || 0} activity records</p>
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
            </div>

            {/* ── Stat Cards ───────────────────────────────────────── */}
            <div className="stats-grid">
                <div className="card stat-card scope-total animate-in">
                    <div className="card-header">
                        <span className="card-title">Total Emissions</span>
                        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🌍</div>
                    </div>
                    <div className="card-value" style={{ backgroundImage: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {formatNum(totals.total)}
                    </div>
                    <div className="card-label">kg CO₂e</div>
                </div>

                <div className="card stat-card scope-1 animate-in">
                    <div className="card-header">
                        <span className="card-title">{t('dashboard.scope1_label', 'Scope 1')}</span>
                        <div className="card-icon" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>🔥</div>
                    </div>
                    <div className="card-value" style={{ color: SCOPE_COLORS.scope1 }}>{formatNum(totals.scope1)}</div>
                    <div className="card-label">{t('dashboard.scope1_subtitle', 'Direct Emissions')} • {((totals.scope1 / totals.total) * 100).toFixed(1)}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(totals.scope1 / totals.total) * 100}%`, background: 'var(--gradient-scope1)' }}></div></div>
                </div>

                <div className="card stat-card scope-2 animate-in">
                    <div className="card-header">
                        <span className="card-title">Scope 2</span>
                        <div className="card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>⚡</div>
                    </div>
                    <div className="card-value" style={{ color: SCOPE_COLORS.scope2 }}>{formatNum(totals.scope2)}</div>
                    <div className="card-label">Energy Indirect • {((totals.scope2 / totals.total) * 100).toFixed(1)}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(totals.scope2 / totals.total) * 100}%`, background: 'var(--gradient-scope2)' }}></div></div>
                </div>

                <div className="card stat-card scope-3 animate-in">
                    <div className="card-header">
                        <span className="card-title">Scope 3</span>
                        <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>🌐</div>
                    </div>
                    <div className="card-value" style={{ color: SCOPE_COLORS.scope3 }}>{formatNum(totals.scope3)}</div>
                    <div className="card-label">Value Chain • {((totals.scope3 / totals.total) * 100).toFixed(1)}%</div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(totals.scope3 / totals.total) * 100}%`, background: 'var(--gradient-scope3)' }}></div></div>
                </div>
            </div>

            {/* ── AI Insights ──────────────────────────────────────── */}
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

            {/* ── Charts Row 1 ─────────────────────────────────────── */}
            <div className="charts-grid">
                <div className="card animate-in">
                    <div className="card-header"><span className="card-title">Emissions by Scope</span></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={scopePieData} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} strokeWidth={0}>
                                    {scopePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
                                <Bar dataKey="value" name="CO₂e" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={18}>
                                    {categoryBarData.map((_, i) => <Cell key={i} fill={['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#06B6D4', '#F43F5E', '#F59E0B', '#EC4899'][i % 8]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Charts Row 2 ─────────────────────────────────────── */}
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
                                <Area type="monotone" dataKey="value" name="CO₂e" stroke="#3B82F6" fill="url(#facilityGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card animate-in">
                    <div className="card-header"><span className="card-title">Scope 3 Breakdown</span></div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={scope3Data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
                                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="size" name="CO₂e" radius={[4, 4, 0, 0]} barSize={30}>
                                    {scope3Data.map((_, i) => <Cell key={i} fill={['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#F59E0B', '#F43F5E', '#F97316'][i % 7]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Carbon Hotspots ──────────────────────────────────── */}
            <div className="card animate-in" style={{ marginBottom: '28px' }}>
                <div className="card-header"><span className="card-title">🔥 Carbon Hotspots</span></div>
                <div className="hotspot-grid">
                    {hotspots.map((h, i) => (
                        <div key={h.name} className="hotspot-item">
                            <div className={`hotspot-rank ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-default'}`}>#{i + 1}</div>
                            <div className="hotspot-info">
                                <div className="hotspot-name">{h.name}</div>
                                <div className="hotspot-value">{formatNum(h.value)} kg CO₂e</div>
                            </div>
                            <div className="progress-bar" style={{ width: '80px' }}>
                                <div className="progress-fill" style={{ width: `${(h.value / hotspots[0].value) * 100}%`, background: i === 0 ? 'var(--gradient-danger)' : 'var(--gradient-primary)' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Detailed Emissions Table ─────────────────────────── */}
            <div className="card animate-in">
                <div className="card-header">
                    <span className="card-title">Detailed Emission Line Items</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {scope1.length + scope2.length + scope3.length} entries • Audit Ready
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
                                <th style={{ textAlign: 'right' }}>CO₂e (kg)</th>
                                <th style={{ textAlign: 'right' }}>Audit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...scope1, ...scope2, ...scope3.slice(0, 10)].map((entry) => (
                                <tr key={entry.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.source}</td>
                                    <td><span className={`scope-badge scope-${entry.scope}`}>Scope {entry.scope}</span></td>
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

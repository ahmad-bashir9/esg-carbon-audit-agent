import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatNum } from '../utils/format';

const INDUSTRIES = ['General Enterprise', 'Logistics & Freight', 'Technology', 'Manufacturing'];

export default function Benchmarks() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedIndustry, setSelectedIndustry] = useState('General Enterprise');

    const fetchBenchmarks = useCallback(async () => {
        try {
            const json = await api.get(`/benchmarks?industry=${encodeURIComponent(selectedIndustry)}`);
            setData(json.data);
        } catch (err) {
            toast.error('Failed to load benchmarks');
        } finally {
            setLoading(false);
        }
    }, [selectedIndustry, toast]);

    useEffect(() => { setLoading(true); fetchBenchmarks(); }, [fetchBenchmarks]);

    const comparisonData = useMemo(() => {
        if (!data) return [];
        const { benchmarks, yourMetrics } = data;
        const items = [];
        for (const bm of benchmarks) {
            const yourVal = yourMetrics[bm.metric];
            if (yourVal !== undefined) {
                const diff = yourVal - bm.value;
                const diffPct = bm.value > 0 ? ((diff / bm.value) * 100).toFixed(0) : 0;
                items.push({
                    metric: bm.metric.replace(/_/g, ' ').replace('total per ', 'Per ').replace('pct', '%'),
                    yours: yourVal,
                    benchmark: bm.value,
                    unit: bm.unit,
                    source: bm.source,
                    diff,
                    diffPct: parseFloat(diffPct),
                    better: bm.metric.includes('pct') ? true : diff <= 0,
                });
            }
        }
        return items;
    }, [data]);

    const chartData = useMemo(() => {
        return comparisonData
            .filter(d => !d.metric.includes('%'))
            .map(d => ({ name: d.metric, You: d.yours, Industry: d.benchmark }));
    }, [comparisonData]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading industry benchmarks...</div>
            </div>
        );
    }

    const hasProfile = data?.profile?.employee_count > 0 || data?.profile?.revenue > 0;

    return (
        <div className="animate-in">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Industry Benchmarks</h2>
                        <p>Compare your carbon performance against industry peers</p>
                    </div>
                    <select className="form-select" value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}
                        style={{ width: 'auto', fontSize: '0.85rem' }}>
                        {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                </div>
            </div>

            {!hasProfile && (
                <div className="card animate-in" style={{ marginBottom: '24px', borderLeft: '3px solid var(--accent-amber)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Company profile incomplete</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Set your employee count and revenue in Settings to see intensity benchmarks (per employee, per $1M revenue).
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {comparisonData.length > 0 ? (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                        {comparisonData.map((d, i) => (
                            <div key={i} className="card stat-card animate-in">
                                <div className="card-header">
                                    <span className="card-title" style={{ textTransform: 'capitalize' }}>{d.metric}</span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d.source}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span className="card-value" style={{ fontSize: '1.5rem' }}>{typeof d.yours === 'number' ? formatNum(d.yours) : d.yours}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.unit}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Industry median: {formatNum(d.benchmark)}</span>
                                    <span className={`stat-trend ${d.better ? 'down' : 'up'}`}>
                                        {d.better ? '▼' : '▲'} {Math.abs(d.diffPct)}%
                                    </span>
                                </div>
                                <div className="progress-bar" style={{ marginTop: '8px' }}>
                                    <div className="progress-fill" style={{
                                        width: `${Math.min(100, d.benchmark > 0 ? (d.yours / d.benchmark) * 50 : 50)}%`,
                                        background: d.better ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {chartData.length > 0 && (
                        <div className="card animate-in" style={{ marginTop: '24px' }}>
                            <div className="card-header">
                                <span className="card-title">Your Performance vs {selectedIndustry} Median</span>
                            </div>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                        <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                                        <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                        <Tooltip formatter={(v) => formatNum(v)} />
                                        <Bar dataKey="You" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={14} />
                                        <Bar dataKey="Industry" fill="#64748B" radius={[0, 4, 4, 0]} barSize={14} opacity={0.5} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <h3>No benchmark comparison available</h3>
                        <p>Update your company profile with employee count and revenue to see how you compare against industry peers.</p>
                    </div>
                </div>
            )}

            {/* Scope Distribution Comparison */}
            {data?.yourMetrics && (
                <div className="card animate-in" style={{ marginTop: '24px' }}>
                    <div className="card-header"><span className="card-title">Scope Distribution vs Industry</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {['scope1', 'scope2', 'scope3'].map((scope, i) => {
                            const yourPct = data.yourMetrics[`${scope}_pct`] || 0;
                            const bm = data.benchmarks.find(b => b.metric === `${scope}_pct`);
                            const benchPct = bm?.value || 0;
                            const labels = ['Direct (Scope 1)', 'Energy (Scope 2)', 'Supply Chain (Scope 3)'];
                            const colors = ['var(--accent-orange)', 'var(--accent-blue)', 'var(--accent-emerald)'];
                            return (
                                <div key={scope} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: colors[i], marginBottom: '8px' }}>{labels[i]}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{yourPct}%</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs {benchPct}% industry</div>
                                    <div className="progress-bar" style={{ marginTop: '8px' }}>
                                        <div className="progress-fill" style={{ width: `${yourPct}%`, background: colors[i] }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

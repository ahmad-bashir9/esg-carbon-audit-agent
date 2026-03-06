import React, { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';

export default function Simulator() {
    const { data: dashboardData, t } = useApp();
    const [params, setParams] = useState({
        renewables: 0,
        evTransition: 0,
        supplyChainRail: 0,
        remoteWork: 0,
    });

    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const hasDashboardData = dashboardData && dashboardData.totals;

    const runSimulation = async () => {
        if (!hasDashboardData) return;
        setLoading(true);
        setError(null);
        try {
            const json = await api.post('/simulator/predict', { params, baseline: dashboardData.totals });
            setPrediction(json.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const simulatedData = prediction && hasDashboardData ? [
        { name: 'Baseline', co2: Math.round(dashboardData.totals.total) },
        { name: 'Target', co2: Math.round(prediction.newTotal) },
    ] : [];

    if (!hasDashboardData) {
        return (
            <div className="animate-in">
                <div className="page-header">
                    <h2>Strategic Decarbonization Sandbox</h2>
                    <p>Model "What-If" scenarios and predict ROI using Gemini AI</p>
                </div>
                <div className="card empty-state">
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>📊</div>
                    <h3>Waiting for Dashboard Data</h3>
                    <p>Visit the Dashboard first to load your baseline emissions data, then return here to run simulations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Strategic Decarbonization Sandbox</h2>
                <p>Model "What-If" scenarios and predict ROI using Gemini AI</p>
            </div>

            {error && (
                <div className="card animate-in" style={{ marginBottom: '20px', borderLeft: '3px solid var(--accent-rose)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '22px' }}>❌</span>
                        <div style={{ color: 'var(--accent-rose)' }}>Simulation failed: {error}</div>
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setError(null)}>✕</button>
                    </div>
                </div>
            )}

            <div className="charts-grid" style={{ gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr)' }}>
                <div className="card">
                    <div className="card-header"><span className="card-title">Strategy Parameters</span></div>

                    <div style={{ display: 'grid', gap: '24px', padding: '10px 0' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">Renewable Energy Mix</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{params.renewables}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.renewables}
                                onChange={e => setParams({ ...params, renewables: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Replaces grid electricity with renewable power agreements or on-site generation</p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">{t('simulator.ev_label', 'Fleet Electrification (EV)')}</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{params.evTransition}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.evTransition}
                                onChange={e => setParams({ ...params, evTransition: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('simulator.ev_hint', 'Transitions combustion vehicles to zero-emission electric fleet')}</p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">Logistics Modal Shift (Rail)</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{params.supplyChainRail}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.supplyChainRail}
                                onChange={e => setParams({ ...params, supplyChainRail: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shifts freight from air/road to low-carbon rail transport</p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">Work-from-Home Policy</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{params.remoteWork}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.remoteWork}
                                onChange={e => setParams({ ...params, remoteWork: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reduces employee commuting through work-from-home policies</p>
                        </div>

                        <button className="btn btn-primary" onClick={runSimulation} disabled={loading} style={{ marginTop: '10px' }}>
                            {loading ? 'Consulting Gemini...' : 'Run Prediction Model'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '24px' }}>
                    <div className="card">
                        <div className="card-header"><span className="card-title">Projected Emission Impact</span></div>
                        <div className="chart-container" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={simulatedData}>
                                    <defs>
                                        <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                    <XAxis dataKey="name" stroke="#64748B" />
                                    <YAxis stroke="#64748B" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="co2" name="kg Carbon" stroke="#10B981" fill="url(#simGrad)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {prediction && (
                        <div className="charts-grid">
                            <div className="card stat-card">
                                <span className="card-title">Estimated Reduction</span>
                                <div className="card-value" style={{ color: 'var(--accent-emerald)' }}>-{Math.round(prediction.reductionPercent)}%</div>
                                <div className="card-label">Annual Carbon Reduction</div>
                            </div>
                            <div className="card stat-card">
                                <span className="card-title">Financial Impact</span>
                                <div className="card-value" style={{ color: prediction.costImpact === 'saving' ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                                    {prediction.costImpact === 'saving' ? '↓' : '↑'} {prediction.costMagnitude}
                                </div>
                                <div className="card-label">{prediction.costImpact === 'saving' ? 'Projected Operational Savings' : 'Est. Implementation Cost'}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {prediction && (
                <div className="card animate-in" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <span className="card-title">🤖 AI Strategy Recommendation</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>Gemini Analysis</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
                        <div>
                            <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>{prediction.analysis}</p>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {prediction.tags?.map(tag => (
                                    <span key={tag} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Implementation Risk</h4>
                            <div className="progress-bar" style={{ height: '8px', marginBottom: '8px' }}>
                                <div className="progress-fill" style={{ width: `${prediction.riskScore}%`, background: prediction.riskScore > 70 ? 'var(--gradient-danger)' : 'var(--gradient-primary)' }}></div>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prediction.riskDetail}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

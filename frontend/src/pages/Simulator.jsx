import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area
} from 'recharts';

export default function Simulator({ dashboardData, vertical, t }) {
    const [scenarios, setScenarios] = useState([
        { id: 1, name: 'Current Baseline', scope1: 0, scope2: 0, scope3: 0, active: true }
    ]);

    // Simulation Sliders
    const [params, setParams] = useState({
        renewables: 0, // % of scope 2 switched to renewable
        evTransition: 0, // % of scope 1 fleet to EV
        supplyChainRail: 0, // % of scope 3 logistics to Rail from Air/Road
        remoteWork: 0, // % reduction in employee commute
    });

    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (dashboardData) {
            setScenarios([{
                id: 1,
                name: 'Current Baseline',
                scope1: dashboardData.totals.scope1,
                scope2: dashboardData.totals.scope2,
                scope3: dashboardData.totals.scope3,
                active: true
            }]);
        }
    }, [dashboardData]);

    const runSimulation = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/simulator/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ params, baseline: dashboardData.totals })
            });
            const json = await res.json();
            if (json.success) {
                setPrediction(json.data);
            }
        } catch (err) {
            console.error('Simulation failed', err);
        } finally {
            setLoading(false);
        }
    };

    const simulatedData = prediction ? [
        { name: 'Baseline', co2: Math.round(dashboardData.totals.total), cost: 100 },
        { name: 'Target', co2: Math.round(prediction.newTotal), cost: Math.round(100 - (prediction.costSavings / 1000)) } // Simplified cost
    ] : [];

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Strategic Decarbonization Sandbox</h2>
                <p>Model "What-If" scenarios and predict ROI using Gemini AI</p>
            </div>

            <div className="charts-grid" style={{ gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr)' }}>
                {/* ── Control Panel ────────────────────────────────── */}
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
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Replaces Scope 2 Grid Electricity with PPA/On-site</p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">{t('simulator.ev_label', 'Fleet Electrification (EV)')}</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{params.evTransition}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.evTransition}
                                onChange={e => setParams({ ...params, evTransition: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('simulator.ev_hint', 'Transitions Scope 1 combustion vehicles to Zero-Emission')}</p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">Logistics Modal Shift (Rail)</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{params.supplyChainRail}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.supplyChainRail}
                                onChange={e => setParams({ ...params, supplyChainRail: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Moves Scope 3 transport from Air/Road to Low-Carbon Rail</p>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label className="form-label">Work-from-Home Policy</label>
                                <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{params.remoteWork}%</span>
                            </div>
                            <input type="range" className="form-range" min="0" max="100" value={params.remoteWork}
                                onChange={e => setParams({ ...params, remoteWork: parseInt(e.target.value) })} />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reduction in Scope 3.7 Employee Commuting activity</p>
                        </div>

                        <button className="btn btn-primary" onClick={runSimulation} disabled={loading} style={{ marginTop: '10px' }}>
                            {loading ? 'Consulting Gemini...' : 'Run Prediction Model'}
                        </button>
                    </div>
                </div>

                {/* ── Visualization ────────────────────────────────── */}
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
                                    <Area type="monotone" dataKey="co2" name="kg CO2e" stroke="#10B981" fill="url(#simGrad)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {prediction && (
                        <div className="grid-2">
                            <div className="card stat-card">
                                <span className="card-title">Estimated Reduction</span>
                                <div className="card-value" style={{ color: 'var(--accent-emerald)' }}>-{Math.round(prediction.reductionPercent)}%</div>
                                <div className="card-label">Annualized CO₂e Avoided</div>
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
                            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                                {prediction.tags.map(tag => (
                                    <span key={tag} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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

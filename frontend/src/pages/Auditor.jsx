import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { scopeLabel, SCOPE_LABELS } from '../utils/format';

export default function Auditor() {
    const { alerts, status, acknowledgeAlert, simulateAnomaly, fetchAlerts } = useApp();
    const toast = useToast();
    const [simScope, setSimScope] = useState('scope1');
    const [simMultiplier, setSimMultiplier] = useState(1.5);
    const [simulating, setSimulating] = useState(false);
    const [thresholds, setThresholds] = useState({});
    const [savingThresholds, setSavingThresholds] = useState(false);

    useEffect(() => {
        api.get('/settings').then(j => setThresholds(j.data)).catch(() => { });
    }, []);

    const handleSimulate = async () => {
        setSimulating(true);
        try {
            await simulateAnomaly(simScope, simMultiplier);
            toast.warning('Anomaly injected — check alerts below');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSimulating(false);
        }
    };

    const handleSaveThresholds = async () => {
        setSavingThresholds(true);
        try {
            await api.put('/settings', thresholds);
            toast.success('Thresholds saved');
        } catch (err) {
            toast.error('Failed to save thresholds: ' + err.message);
        } finally {
            setSavingThresholds(false);
        }
    };

    const unresolvedAlerts = useMemo(() => alerts.filter(a => !a.acknowledged), [alerts]);
    const resolvedAlerts = useMemo(() => alerts.filter(a => a.acknowledged), [alerts]);

    const parseRCA = (alert) => {
        try {
            return alert.root_cause_analysis ? JSON.parse(alert.root_cause_analysis) : null;
        } catch { return null; }
    };

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Auditor Agent</h2>
                        <p>Autonomous monitoring with configurable deviation thresholds</p>
                    </div>
                    <button className="btn btn-secondary" onClick={fetchAlerts}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="card stat-card animate-in" style={{ borderTop: '3px solid var(--accent-emerald)' }}>
                    <div className="card-title" style={{ marginBottom: '12px' }}>Agent Status</div>
                    <div className="card-value" style={{ fontSize: '1.4rem', color: 'var(--accent-emerald)' }}>Active</div>
                    <div className="card-label">DB-backed persistent monitoring</div>
                </div>
                <div className="card stat-card animate-in" style={{ borderTop: '3px solid var(--accent-blue)' }}>
                    <div className="card-title" style={{ marginBottom: '12px' }}>History Depth</div>
                    <div className="card-value" style={{ fontSize: '1.4rem' }}>{status?.historyDepth || 0}</div>
                    <div className="card-label">Emission snapshots (SQLite)</div>
                </div>
                <div className="card stat-card animate-in" style={{ borderTop: '3px solid var(--accent-amber)' }}>
                    <div className="card-title" style={{ marginBottom: '12px' }}>Total Alerts</div>
                    <div className="card-value" style={{ fontSize: '1.4rem', color: 'var(--accent-amber)' }}>{status?.totalAlerts || alerts.length}</div>
                    <div className="card-label">All-time detections</div>
                </div>
                <div className="card stat-card animate-in" style={{ borderTop: '3px solid var(--accent-rose)' }}>
                    <div className="card-title" style={{ marginBottom: '12px' }}>Unresolved</div>
                    <div className="card-value" style={{ fontSize: '1.4rem', color: 'var(--accent-rose)' }}>{unresolvedAlerts.length}</div>
                    <div className="card-label">Pending review</div>
                </div>
            </div>

            {/* Threshold Configuration */}
            <div className="card animate-in" style={{ marginBottom: '28px' }}>
                <div className="card-header">
                    <span className="card-title">⚙️ Deviation Thresholds</span>
                    <button className="btn btn-secondary btn-sm" onClick={handleSaveThresholds} disabled={savingThresholds}>
                        {savingThresholds ? 'Saving...' : '💾 Save'}
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                    {[
                        { key: 'auditor_threshold', label: 'Global Threshold' },
                        { key: 'auditor_scope1_threshold', label: `${scopeLabel(1, 'full')} Threshold` },
                        { key: 'auditor_scope2_threshold', label: `${scopeLabel(2, 'full')} Threshold` },
                        { key: 'auditor_scope3_threshold', label: `${scopeLabel(3, 'full')} Threshold` },
                    ].map(item => (
                        <div key={item.key} className="form-group">
                            <label className="form-label">{item.label}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input className="form-input" type="number" step="0.01" min="0.01" max="1"
                                    value={thresholds[item.key] || '0.10'}
                                    onChange={e => setThresholds({ ...thresholds, [item.key]: e.target.value })}
                                    style={{ width: '80px' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    ({((parseFloat(thresholds[item.key]) || 0.10) * 100).toFixed(0)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Anomaly Simulator */}
            <div className="card animate-in" style={{ marginBottom: '28px' }}>
                <div className="card-header">
                    <span className="card-title">🧪 Anomaly Simulator</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demo: Inject a deviation to trigger the agent</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group">
                        <label className="form-label">Target Category</label>
                        <select className="form-select" value={simScope} onChange={e => setSimScope(e.target.value)}>
                            <option value="scope1">{SCOPE_LABELS[1].option}</option>
                            <option value="scope2">{SCOPE_LABELS[2].option}</option>
                            <option value="scope3">{SCOPE_LABELS[3].option}</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Multiplier</label>
                        <select className="form-select" value={simMultiplier} onChange={e => setSimMultiplier(parseFloat(e.target.value))}>
                            <option value="1.15">+15% (Warning)</option>
                            <option value="1.3">+30% (Critical)</option>
                            <option value="1.5">+50% (Critical)</option>
                            <option value="0.7">-30% (Drop)</option>
                        </select>
                    </div>
                    <button className="btn btn-danger" onClick={handleSimulate} disabled={simulating}>
                        {simulating ? (
                            <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Injecting...</>
                        ) : '⚡ Simulate Anomaly'}
                    </button>
                </div>
            </div>

            {/* Active Alerts */}
            <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    🔔 Active Alerts ({unresolvedAlerts.length})
                </h3>
                {unresolvedAlerts.length === 0 ? (
                    <div className="card empty-state">
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
                        <h3>No Active Alerts</h3>
                        <p>All emissions are within configured thresholds. Use the simulator above to test.</p>
                    </div>
                ) : (
                    unresolvedAlerts.map(alert => {
                        const rca = parseRCA(alert);
                        return (
                            <div key={alert.id} className={`alert-item ${alert.severity} animate-in`}>
                                <div className={`alert-icon ${alert.severity}`}>
                                    {alert.severity === 'critical' ? '🚨' : '⚠️'}
                                </div>
                                <div className="alert-content">
                                    <div className="alert-title">
                                        {alert.type === 'SPIKE' ? '📈' : '📉'} {(alert.scope || alert.category || '').toUpperCase()} Deviation
                                    </div>
                                    <div className="alert-message">{alert.message}</div>
                                    <div className="alert-meta">
                                        <span>Baseline: {(alert.baseline_value ?? alert.baselineValue)?.toLocaleString()} kg</span>
                                        <span>Current: {(alert.current_value ?? alert.currentValue)?.toLocaleString()} kg</span>
                                        <span>Deviation: {(alert.deviation_percent ?? alert.deviationPercent) > 0 ? '+' : ''}{alert.deviation_percent ?? alert.deviationPercent}%</span>
                                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                                    </div>
                                    {rca && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-violet)' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-violet)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                                                🤖 AI Root Cause Analysis
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>{rca.root_cause}</div>
                                            {rca.recommendations && (
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Recommendations:</div>
                                                    <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0 }}>
                                                        {rca.recommendations.map((r, i) => <li key={i} style={{ marginBottom: '3px' }}>{r}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="alert-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => acknowledgeAlert(alert.id)}>✓ Acknowledge</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Resolved Alerts */}
            {resolvedAlerts.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-muted)' }}>
                        Acknowledged ({resolvedAlerts.length})
                    </h3>
                    {resolvedAlerts.slice(0, 5).map(alert => (
                        <div key={alert.id} className="alert-item" style={{ opacity: 0.5 }}>
                            <div className="alert-icon" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✓</div>
                            <div className="alert-content">
                                <div className="alert-title" style={{ color: 'var(--text-muted)' }}>
                                    {(alert.scope || alert.category || '').toUpperCase()} – Resolved
                                </div>
                                <div className="alert-message">{alert.message}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

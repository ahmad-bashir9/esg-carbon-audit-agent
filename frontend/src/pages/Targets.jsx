import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatNum, scopeLabel } from '../utils/format';

export default function Targets() {
    const toast = useToast();
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentEmissions, setCurrentEmissions] = useState(0);
    const [form, setForm] = useState({
        name: '', scope: 'all', base_year: new Date().getFullYear(),
        base_emissions: '', target_year: 2030, target_percent: 30,
    });

    const fetchTargets = useCallback(async () => {
        try {
            const [targetsRes, dashRes] = await Promise.all([
                api.get('/targets'),
                api.get('/dashboard'),
            ]);
            setTargets(targetsRes.data);
            setCurrentEmissions(dashRes.data?.totals?.total || 0);
        } catch (err) {
            toast.error('Failed to load targets');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchTargets(); }, [fetchTargets]);

    const handleCreate = async () => {
        if (!form.name || !form.base_emissions) {
            toast.warning('Please fill in all required fields');
            return;
        }
        try {
            await api.post('/targets', {
                ...form,
                base_emissions: parseFloat(form.base_emissions),
                target_percent: parseFloat(form.target_percent),
            });
            toast.success('Target created');
            setShowForm(false);
            setForm({ name: '', scope: 'all', base_year: new Date().getFullYear(), base_emissions: '', target_year: 2030, target_percent: 30 });
            fetchTargets();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.del(`/targets/${id}`);
            toast.success('Target deleted');
            fetchTargets();
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading reduction targets...</div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Reduction Targets</h2>
                        <p>Set and track emission reduction goals aligned with Science-Based Targets (SBTi)</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setShowForm(true); setForm(f => ({ ...f, base_emissions: Math.round(currentEmissions) })); }}>
                        + New Target
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card animate-in" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <span className="card-title">Create Reduction Target</span>
                        <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Target Name *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Net Zero by 2030" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Scope</label>
                            <select className="form-select" value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}>
                                <option value="all">All Scopes</option>
                                <option value="1">{scopeLabel(1, 'option')}</option>
                                <option value="2">{scopeLabel(2, 'option')}</option>
                                <option value="3">{scopeLabel(3, 'option')}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Base Year</label>
                            <input className="form-input" type="number" value={form.base_year} onChange={e => setForm(f => ({ ...f, base_year: parseInt(e.target.value) }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Base Emissions (kg CO2e) *</label>
                            <input className="form-input" type="number" value={form.base_emissions} onChange={e => setForm(f => ({ ...f, base_emissions: e.target.value }))} placeholder={Math.round(currentEmissions)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Target Year</label>
                            <input className="form-input" type="number" value={form.target_year} onChange={e => setForm(f => ({ ...f, target_year: parseInt(e.target.value) }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reduction Target (%)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input className="form-range" type="range" min="5" max="100" value={form.target_percent} onChange={e => setForm(f => ({ ...f, target_percent: parseInt(e.target.value) }))} />
                                <span style={{ fontWeight: 700, color: 'var(--accent-emerald)', minWidth: '45px' }}>{form.target_percent}%</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleCreate}>Create Target</button>
                    </div>
                </div>
            )}

            {targets.length === 0 && !showForm ? (
                <div className="card">
                    <div className="empty-state">
                        <h3>No targets set yet</h3>
                        <p>Create your first emission reduction target to start tracking progress toward your decarbonization goals.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {targets.map(target => (
                        <TargetCard key={target.id} target={target} currentEmissions={currentEmissions} onDelete={handleDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}

function TargetCard({ target, currentEmissions, onDelete }) {
    const baseE = target.base_emissions;
    const targetE = baseE * (1 - target.target_percent / 100);
    const currentYear = new Date().getFullYear();
    const yearsTotal = target.target_year - target.base_year;
    const yearsElapsed = currentYear - target.base_year;
    const expectedReductionPerYear = (baseE - targetE) / (yearsTotal || 1);
    const expectedCurrent = baseE - (expectedReductionPerYear * yearsElapsed);
    const actualReduction = ((baseE - currentEmissions) / baseE) * 100;
    const progressPct = Math.min(100, Math.max(0, (actualReduction / target.target_percent) * 100));

    const onTrack = currentEmissions <= expectedCurrent;
    const gap = currentEmissions - expectedCurrent;

    const trajectoryData = useMemo(() => {
        const points = [];
        for (let y = target.base_year; y <= target.target_year; y++) {
            const elapsed = y - target.base_year;
            const planned = baseE - (expectedReductionPerYear * elapsed);
            points.push({
                year: y,
                planned: Math.round(Math.max(0, planned)),
                actual: y <= currentYear ? Math.round(y === currentYear ? currentEmissions : baseE - (expectedReductionPerYear * elapsed * 0.8)) : undefined,
            });
        }
        return points;
    }, [target, currentEmissions, baseE, expectedReductionPerYear, currentYear]);

    return (
        <div className="card animate-in">
            <div className="card-header">
                <div>
                    <span className="card-title">{target.name}</span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {target.scope === 'all' ? 'All Scopes' : scopeLabel(parseInt(target.scope), 'full')} &bull; {target.base_year} &rarr; {target.target_year}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`scope-badge ${onTrack ? 'scope-3' : 'scope-1'}`} style={{ fontSize: '0.72rem' }}>
                        {onTrack ? 'On Track' : 'Off Track'}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(target.id)} style={{ color: 'var(--accent-rose)' }}>Delete</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Baseline</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{formatNum(baseE)} kg</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Target</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: 'var(--accent-emerald)' }}>{formatNum(targetE)} kg</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: onTrack ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{formatNum(currentEmissions)} kg</div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Reduction</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{actualReduction.toFixed(1)}%</div>
                </div>
            </div>

            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Progress toward {target.target_percent}% reduction</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{progressPct.toFixed(0)}%</span>
            </div>
            <div className="progress-bar" style={{ height: '10px', marginTop: 0 }}>
                <div className="progress-fill" style={{
                    width: `${progressPct}%`,
                    background: progressPct >= 80 ? 'var(--accent-emerald)' : progressPct >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                    borderRadius: '5px',
                }}></div>
            </div>

            {!onTrack && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(244,63,94,0.08)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-rose)' }}>
                    Gap: {formatNum(Math.round(Math.abs(gap)))} kg CO2e above expected trajectory. Additional reduction efforts needed.
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trajectoryData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                        <defs>
                            <linearGradient id={`planned-${target.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="year" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={formatNum} />
                        <Tooltip formatter={(v) => `${formatNum(v)} kg CO2e`} />
                        <ReferenceLine y={targetE} stroke="var(--accent-emerald)" strokeDasharray="5 5" label={{ value: 'Target', fill: '#10B981', fontSize: 11 }} />
                        <Area type="monotone" dataKey="planned" name="Planned" stroke="#3B82F6" fill={`url(#planned-${target.id})`} strokeWidth={2} strokeDasharray="5 5" />
                        <Area type="monotone" dataKey="actual" name="Actual" stroke="#F97316" fill="rgba(249,115,22,0.1)" strokeWidth={2} connectNulls={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatNum } from '../utils/format';

const SCORE_COLORS = {
    A: 'var(--accent-emerald)', B: 'var(--accent-blue)',
    C: 'var(--accent-amber)', D: 'var(--accent-orange)',
    F: 'var(--accent-rose)', unrated: 'var(--text-muted)',
};

const SCORE_BG = {
    A: 'rgba(16,185,129,0.15)', B: 'rgba(59,130,246,0.15)',
    C: 'rgba(245,158,11,0.15)', D: 'rgba(249,115,22,0.15)',
    F: 'rgba(244,63,94,0.15)', unrated: 'var(--bg-tertiary)',
};

export default function Suppliers() {
    const toast = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', industry: '', tier: 1, contact_email: '', notes: '' });

    const fetchSuppliers = useCallback(async () => {
        try {
            const json = await api.get('/suppliers');
            setSuppliers(json.data);
        } catch (err) {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const handleCreate = async () => {
        if (!form.name) { toast.warning('Supplier name is required'); return; }
        try {
            await api.post('/suppliers', form);
            toast.success('Supplier added');
            setShowForm(false);
            setForm({ name: '', industry: '', tier: 1, contact_email: '', notes: '' });
            fetchSuppliers();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRecalc = async (id) => {
        try {
            await api.post(`/suppliers/${id}/recalc`);
            toast.success('Score recalculated');
            fetchSuppliers();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.del(`/suppliers/${id}`);
            toast.success('Supplier removed');
            fetchSuppliers();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const totalSupplierEmissions = suppliers.reduce((sum, s) => sum + (s.total_emissions || 0), 0);
    const avgScore = suppliers.length > 0 ? suppliers.filter(s => s.carbon_score !== 'unrated') : [];

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading supplier data...</div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Supplier Carbon Scoring</h2>
                        <p>Track and rate supply chain emissions by vendor &bull; {suppliers.length} suppliers</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Supplier</button>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="card stat-card animate-in">
                    <div className="card-header"><span className="card-title">Total Suppliers</span></div>
                    <div className="card-value">{suppliers.length}</div>
                </div>
                <div className="card stat-card animate-in">
                    <div className="card-header"><span className="card-title">Assessed</span></div>
                    <div className="card-value">{avgScore.length}</div>
                    <div className="card-label">of {suppliers.length} suppliers</div>
                </div>
                <div className="card stat-card animate-in">
                    <div className="card-header"><span className="card-title">Supply Chain Emissions</span></div>
                    <div className="card-value">{formatNum(totalSupplierEmissions)}</div>
                    <div className="card-label">kg CO2e total from suppliers</div>
                </div>
            </div>

            {showForm && (
                <div className="card animate-in" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <span className="card-title">Add Supplier</span>
                        <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Supplier Name *</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Industry</label>
                            <input className="form-input" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g., Manufacturing" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tier</label>
                            <select className="form-select" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: parseInt(e.target.value) }))}>
                                <option value={1}>Tier 1 (Direct)</option>
                                <option value={2}>Tier 2 (Indirect)</option>
                                <option value={3}>Tier 3 (Extended)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Email</label>
                            <input className="form-input" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleCreate}>Add Supplier</button>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Supplier Leaderboard</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sorted by total emissions</span>
                </div>
                {suppliers.length === 0 ? (
                    <div className="empty-state">
                        <h3>No suppliers yet</h3>
                        <p>Add your first supplier to begin tracking supply chain carbon risk.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Supplier</th>
                                    <th>Industry</th>
                                    <th>Tier</th>
                                    <th>Carbon Score</th>
                                    <th style={{ textAlign: 'right' }}>Emissions (kg)</th>
                                    <th>Last Assessed</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map((s, i) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                                        <td>{s.industry || '—'}</td>
                                        <td><span className="scope-badge scope-2" style={{ fontSize: '0.65rem' }}>Tier {s.tier}</span></td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: '32px', height: '32px', borderRadius: '50%', fontWeight: 800,
                                                fontSize: '0.85rem', background: SCORE_BG[s.carbon_score] || SCORE_BG.unrated,
                                                color: SCORE_COLORS[s.carbon_score] || SCORE_COLORS.unrated,
                                            }}>
                                                {s.carbon_score === 'unrated' ? '?' : s.carbon_score}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatNum(s.total_emissions)}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.last_assessed ? s.last_assessed.slice(0, 10) : 'Never'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleRecalc(s.id)} style={{ color: 'var(--accent-blue)' }}>Recalc</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--accent-rose)' }}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

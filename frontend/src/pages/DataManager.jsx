import React, { useState, useEffect, useCallback } from 'react';

const SCOPE_OPTIONS = [
    { value: 1, label: 'Scope 1 – Direct' },
    { value: 2, label: 'Scope 2 – Energy' },
    { value: 3, label: 'Scope 3 – Value Chain' },
];

const CATEGORY_MAP = {
    1: ['Fuel Combustion'],
    2: ['Purchased Electricity', 'Purchased Steam'],
    3: ['Purchased Goods', 'Downstream Transport', 'Business Travel', 'Employee Commute', 'Waste Disposal'],
};

export default function DataManager({ vertical, t }) {
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ scope: '', category: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [newRecord, setNewRecord] = useState({
        date: new Date().toISOString().split('T')[0],
        scope: 1,
        category: 'Fuel Combustion',
        source_type: '',
        description: '',
        quantity: '',
        unit: '',
        facility: '',
        department: '',
    });

    const fetchActivities = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.scope) params.set('scope', filters.scope);
            if (filters.category) params.set('category', filters.category);

            const res = await fetch(`/api/data/activities?${params}`);
            const json = await res.json();
            if (json.success) {
                setActivities(json.data);
                setStats(json.stats);
            }
        } catch (err) {
            console.error('Failed to load activities:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchActivities(); }, [fetchActivities]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/data/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newRecord, quantity: parseFloat(newRecord.quantity) }),
            });
            const json = await res.json();
            if (json.success) {
                setShowAddForm(false);
                setNewRecord({ date: new Date().toISOString().split('T')[0], scope: 1, category: 'Fuel Combustion', source_type: '', description: '', quantity: '', unit: '', facility: '', department: '' });
                fetchActivities();
            }
        } catch (err) {
            console.error('Failed to add record:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this activity record?')) return;
        try {
            await fetch(`/api/data/activities/${id}`, { method: 'DELETE' });
            fetchActivities();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/data/upload', { method: 'POST', body: formData });
            const json = await res.json();
            setUploadResult(json);
            if (json.success) fetchActivities();
        } catch (err) {
            setUploadResult({ success: false, error: err.message });
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const formatNum = (n) => n === undefined ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Data Manager</h2>
                        <p>Upload, view, and manage your carbon activity data</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setShowAddForm(!showAddForm)}>
                            {showAddForm ? '✕ Close' : '+ Add Record'}
                        </button>
                        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                            {uploading ? (
                                <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Uploading...</>
                            ) : '📤 Upload CSV'}
                            <input type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            </div>

            {/* ── Stats Cards ──────────────────────────────────────── */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
                    <div className="card stat-card animate-in" style={{ borderTop: '3px solid var(--accent-blue)' }}>
                        <div className="card-title" style={{ marginBottom: '8px' }}>Total Records</div>
                        <div className="card-value" style={{ fontSize: '1.5rem' }}>{stats.totalRecords}</div>
                        <div className="card-label">Activity entries</div>
                    </div>
                    {stats.byScope?.map(s => (
                        <div key={s.scope} className={`card stat-card scope-${s.scope} animate-in`}>
                            <div className="card-title" style={{ marginBottom: '8px' }}>Scope {s.scope}</div>
                            <div className="card-value" style={{ fontSize: '1.5rem' }}>{s.count}</div>
                            <div className="card-label">records</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Upload Result ────────────────────────────────────── */}
            {uploadResult && (
                <div className={`card animate-in`} style={{
                    marginBottom: '20px',
                    borderLeft: `3px solid ${uploadResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '22px' }}>{uploadResult.success ? '✅' : '❌'}</span>
                        <div>
                            {uploadResult.success ? (
                                <>
                                    <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                                        Imported {uploadResult.imported} of {uploadResult.totalRows} rows
                                    </div>
                                    {uploadResult.errors > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', marginTop: '4px' }}>
                                            {uploadResult.errors} rows had errors: {uploadResult.errorDetails?.map(e => `Row ${e.row}: ${e.error}`).join('; ')}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ color: 'var(--accent-rose)' }}>Upload failed: {uploadResult.error}</div>
                            )}
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setUploadResult(null)}>✕</button>
                    </div>
                </div>
            )}

            {/* ── CSV Template Info ────────────────────────────────── */}
            <div className="card animate-in" style={{ marginBottom: '20px' }}>
                <div className="card-header">
                    <span className="card-title">📋 CSV Format Guide</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Upload a CSV file with these columns. Only <strong>date</strong>, <strong>scope</strong>, <strong>category</strong>, and <strong>quantity</strong> are required.
                </p>
                <div style={{ overflowX: 'auto' }}>
                    <code style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '6px', display: 'block' }}>
                        date, scope, category, source_type, description, quantity, unit, facility, department, supplier, origin, destination, transport_mode
                    </code>
                </div>
            </div>

            {/* ── Add Record Form ──────────────────────────────────── */}
            {showAddForm && (
                <div className="card animate-in" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <span className="card-title">➕ Add Activity Record</span>
                    </div>
                    <form onSubmit={handleAdd}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input className="form-input" type="date" required value={newRecord.date}
                                    onChange={e => setNewRecord({ ...newRecord, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Scope *</label>
                                <select className="form-select" value={newRecord.scope}
                                    onChange={e => setNewRecord({ ...newRecord, scope: parseInt(e.target.value), category: CATEGORY_MAP[e.target.value]?.[0] || '' })}>
                                    <option value={1}>{t('data_manager.scope1', 'Scope 1 – Direct')}</option>
                                    <option value={2}>{t('data_manager.scope2', 'Scope 2 – Energy')}</option>
                                    <option value={3}>{t('data_manager.scope3', 'Scope 3 – Value Chain')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select className="form-select" value={newRecord.category}
                                    onChange={e => setNewRecord({ ...newRecord, category: e.target.value })}>
                                    {(CATEGORY_MAP[newRecord.scope] || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Source Type</label>
                                <input className="form-input" placeholder="e.g., Diesel, Electricity" value={newRecord.source_type}
                                    onChange={e => setNewRecord({ ...newRecord, source_type: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input className="form-input" type="number" step="any" required placeholder="e.g., 1200" value={newRecord.quantity}
                                    onChange={e => setNewRecord({ ...newRecord, quantity: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Unit *</label>
                                <input className="form-input" required placeholder="e.g., liters, kWh, tons" value={newRecord.unit}
                                    onChange={e => setNewRecord({ ...newRecord, unit: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input className="form-input" placeholder="e.g., Fleet Truck A diesel" value={newRecord.description}
                                    onChange={e => setNewRecord({ ...newRecord, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Facility</label>
                                <input className="form-input" placeholder="e.g., Plant 1, HQ Office" value={newRecord.facility}
                                    onChange={e => setNewRecord({ ...newRecord, facility: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <input className="form-input" placeholder="e.g., Logistics, Sales" value={newRecord.department}
                                    onChange={e => setNewRecord({ ...newRecord, department: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Record</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Filters ──────────────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Filters</span>
                    <select className="form-select" value={filters.scope}
                        onChange={e => setFilters({ ...filters, scope: e.target.value })} style={{ width: 'auto' }}>
                        <option value="">All Scopes</option>
                        {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="form-select" value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })} style={{ width: 'auto' }}>
                        <option value="">All Categories</option>
                        {Object.values(CATEGORY_MAP).flat().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ scope: '', category: '' })}>Clear</button>
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {activities.length} records
                    </span>
                </div>
            </div>

            {/* ── Data Table ───────────────────────────────────────── */}
            <div className="card animate-in">
                <div style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div className="loading-container"><div className="loading-spinner"></div><div className="loading-text">Loading...</div></div>
                    ) : activities.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
                            <h3>No Activity Data</h3>
                            <p>Upload a CSV file or add records manually to get started.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Scope</th>
                                    <th>Category</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'right' }}>Quantity</th>
                                    <th>Unit</th>
                                    <th>Source</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.slice(0, 100).map(a => (
                                    <tr key={a.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{a.date}</td>
                                        <td><span className={`scope-badge scope-${a.scope}`}>Scope {a.scope}</span></td>
                                        <td>{a.category}</td>
                                        <td style={{ color: 'var(--text-primary)' }}>{a.source_type}</td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</td>
                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatNum(a.quantity)}</td>
                                        <td>{a.unit}</td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 600,
                                                background: a.data_source === 'csv-upload' ? 'rgba(139,92,246,0.15)' : a.data_source === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                                                color: a.data_source === 'csv-upload' ? 'var(--accent-violet)' : a.data_source === 'manual' ? 'var(--accent-amber)' : 'var(--accent-blue-light)',
                                            }}>
                                                {a.data_source}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)}
                                                style={{ color: 'var(--accent-rose)', padding: '4px 8px' }}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}

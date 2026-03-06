import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { formatNumFull, scopeLabel, SCOPE_LABELS } from '../utils/format';

const SCOPE_OPTIONS = [
    { value: 1, label: SCOPE_LABELS[1].option },
    { value: 2, label: SCOPE_LABELS[2].option },
    { value: 3, label: SCOPE_LABELS[3].option },
];

const CATEGORY_MAP = {
    1: ['Fuel Combustion'],
    2: ['Purchased Electricity', 'Purchased Steam'],
    3: ['Purchased Goods', 'Downstream Transport', 'Business Travel', 'Employee Commute', 'Waste Disposal'],
};

const PAGE_SIZES = [10, 25, 50, 100];

const SORTABLE_COLS = [
    { key: 'date', label: 'Date' },
    { key: 'scope', label: 'Emission Type' },
    { key: 'category', label: 'Category' },
    { key: 'source_type', label: 'Type' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'unit', label: 'Unit' },
    { key: 'data_source', label: 'Source' },
];

export default function DataManager() {
    const { t } = useApp();
    const toast = useToast();
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ scope: '', category: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [pagination, setPagination] = useState(null);
    const [exporting, setExporting] = useState(false);

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
            if (search.trim()) params.set('search', search.trim());
            params.set('page', page);
            params.set('pageSize', pageSize);
            params.set('sortBy', sortBy);
            params.set('sortDir', sortDir);

            const json = await api.get(`/data/activities?${params}`);
            setActivities(json.data);
            setStats(json.stats);
            setPagination(json.pagination || null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters, search, page, pageSize, sortBy, sortDir, toast]);

    useEffect(() => { fetchActivities(); }, [fetchActivities]);

    useEffect(() => { setPage(1); }, [filters, search, pageSize]);

    const handleSort = (col) => {
        if (sortBy === col) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir('asc');
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/data/activities', { ...newRecord, quantity: parseFloat(newRecord.quantity) });
            setShowAddForm(false);
            setNewRecord({ date: new Date().toISOString().split('T')[0], scope: 1, category: 'Fuel Combustion', source_type: '', description: '', quantity: '', unit: '', facility: '', department: '' });
            toast.success('Activity record added successfully');
            fetchActivities();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this activity record?')) return;
        try {
            await api.del(`/data/activities/${id}`);
            toast.success('Record deleted');
            fetchActivities();
        } catch (err) {
            toast.error(err.message);
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
            const json = await api.upload('/data/upload', formData);
            setUploadResult(json);
            toast.success(`Imported ${json.imported} of ${json.totalRows} rows`);
            fetchActivities();
        } catch (err) {
            setUploadResult({ success: false, error: err.message });
            toast.error(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (filters.scope) params.set('scope', filters.scope);
            if (filters.category) params.set('category', filters.category);
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/data/export?${params}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `carbonlens_export_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success('CSV exported successfully');
        } catch (err) {
            toast.error(`Export failed: ${err.message}`);
        } finally {
            setExporting(false);
        }
    };

    const totalPages = pagination?.totalPages || 1;

    const pageButtons = useMemo(() => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    }, [page, totalPages]);

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Data Manager</h2>
                        <p>Upload, view, and manage your carbon activity data</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={() => setShowAddForm(!showAddForm)}>
                            {showAddForm ? '✕ Close' : '+ Add Record'}
                        </button>
                        <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
                            {exporting ? 'Exporting...' : '📥 Export CSV'}
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

            {/* Stats Cards */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
                    <div className="card stat-card animate-in" style={{ borderTop: '3px solid var(--accent-blue)' }}>
                        <div className="card-title" style={{ marginBottom: '8px' }}>Total Records</div>
                        <div className="card-value" style={{ fontSize: '1.5rem' }}>{stats.totalRecords}</div>
                        <div className="card-label">Activity entries</div>
                    </div>
                    {stats.byScope?.map(s => (
                        <div key={s.scope} className={`card stat-card scope-${s.scope} animate-in`}>
                            <div className="card-title" style={{ marginBottom: '8px' }}>{scopeLabel(s.scope)}</div>
                            <div className="card-value" style={{ fontSize: '1.5rem' }}>{s.count}</div>
                            <div className="card-label">records</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
                <div className="card animate-in" style={{
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

            {/* CSV Template Info */}
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

            {/* Add Record Form */}
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
                                    <option value={1}>{t('data_manager.scope1', SCOPE_LABELS[1].option)}</option>
                                    <option value={2}>{t('data_manager.scope2', SCOPE_LABELS[2].option)}</option>
                                    <option value={3}>{t('data_manager.scope3', SCOPE_LABELS[3].option)}</option>
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
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Record'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters + Search */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Filters</span>
                    <select className="form-select" value={filters.scope}
                        onChange={e => setFilters({ ...filters, scope: e.target.value })} style={{ width: 'auto' }}>
                        <option value="">All Emission Types</option>
                        {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select className="form-select" value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })} style={{ width: 'auto' }}>
                        <option value="">All Categories</option>
                        {Object.values(CATEGORY_MAP).flat().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input className="form-input" placeholder="Search records..." value={search}
                            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px', width: '200px' }} />
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ scope: '', category: '' }); setSearch(''); }}>Clear</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select className="form-select" value={pageSize} onChange={e => setPageSize(Number(e.target.value))} style={{ width: 'auto', fontSize: '0.8rem', padding: '6px 28px 6px 10px' }}>
                            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
                        </select>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {pagination ? `${pagination.total} total` : `${activities.length} records`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Data Table */}
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
                        <>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        {SORTABLE_COLS.map(col => (
                                            <th key={col.key}
                                                className="sortable"
                                                style={col.align ? { textAlign: col.align } : undefined}
                                                onClick={() => handleSort(col.key)}>
                                                {col.label}
                                                <span className={`sort-indicator ${sortBy === col.key ? 'active' : ''}`}>
                                                    {sortBy === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                                                </span>
                                            </th>
                                        ))}
                                        <th>Description</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activities.map(a => (
                                        <tr key={a.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{a.date}</td>
                                            <td><span className={`scope-badge scope-${a.scope}`}>{scopeLabel(a.scope)}</span></td>
                                            <td>{a.category}</td>
                                            <td style={{ color: 'var(--text-primary)' }}>{a.source_type}</td>
                                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatNumFull(a.quantity)}</td>
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
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)}
                                                    aria-label="Delete record"
                                                    style={{ color: 'var(--accent-rose)', padding: '4px 8px' }}>🗑</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {pagination && totalPages > 1 && (
                                <div className="pagination">
                                    <div className="pagination-info">
                                        Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, pagination.total)} of {pagination.total}
                                    </div>
                                    <div className="pagination-buttons">
                                        <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
                                        <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                                        {pageButtons.map(p => (
                                            <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                        ))}
                                        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                                        <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

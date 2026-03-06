import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function Integrations() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [auditLog, setAuditLog] = useState([]);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditFilter, setAuditFilter] = useState({ entity_type: '', action: '' });

    const fetchStatus = useCallback(async () => {
        try {
            const json = await api.get('/integrations/status');
            setData(json.data);
        } catch (err) {
            toast.error('Failed to load integration status');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchAuditLog = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (auditFilter.entity_type) params.set('entity_type', auditFilter.entity_type);
            if (auditFilter.action) params.set('action', auditFilter.action);
            const json = await api.get(`/audit-log?${params}`);
            setAuditLog(json.data);
            setAuditTotal(json.total);
        } catch (_) {}
    }, [auditFilter]);

    useEffect(() => { fetchStatus(); fetchAuditLog(); }, [fetchStatus, fetchAuditLog]);

    const handleSyncNow = async () => {
        setSyncing(true);
        try {
            const json = await api.post('/integrations/sync-now');
            const totalNew = json.data.reduce((s, r) => s + (r.new || 0), 0);
            toast.success(`Sync complete: ${totalNew} new records imported`);
            fetchStatus();
        } catch (err) {
            toast.error('Sync failed: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading integrations...</div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2>Integrations & Audit Log</h2>
                        <p>Connected data sources and system activity trail</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleSyncNow} disabled={syncing}>
                        {syncing ? <><span className="loading-spinner-sm"></span> Syncing...</> : 'Sync Now'}
                    </button>
                </div>
            </div>

            {/* Connected Systems */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px' }}>
                {data && ['erp', 'crm'].map(key => {
                    const sys = data[key];
                    return (
                        <div key={key} className="card stat-card animate-in">
                            <div className="card-header">
                                <span className="card-title">{sys?.name || key.toUpperCase()}</span>
                                <span className={`status-dot ${sys?.connected ? '' : 'offline'}`} style={{ width: '10px', height: '10px' }}></span>
                            </div>
                            <div className="card-value" style={{ fontSize: '1rem', color: sys?.connected ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                                {sys?.connected ? 'Connected' : 'Disconnected'}
                            </div>
                            <div className="card-label">MCP Protocol &bull; {key.toUpperCase()}</div>
                        </div>
                    );
                })}
                <div className="card stat-card animate-in">
                    <div className="card-header"><span className="card-title">Last Sync</span></div>
                    <div className="card-value" style={{ fontSize: '1rem' }}>
                        {data?.lastSync ? new Date(data.lastSync).toLocaleString() : 'Never'}
                    </div>
                    <div className="card-label">Auto-sync every 6 hours</div>
                </div>
            </div>

            {/* Sync History */}
            {data?.syncLogs?.length > 0 && (
                <div className="card animate-in" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <span className="card-title">Sync History</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{data.syncLogs.length} entries</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Source</th>
                                    <th>Tool</th>
                                    <th>Fetched</th>
                                    <th>New</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.syncLogs.slice(0, 15).map((log, i) => (
                                    <tr key={i}>
                                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{log.synced_at?.slice(0, 19).replace('T', ' ')}</td>
                                        <td><span className="scope-badge scope-2">{log.source}</span></td>
                                        <td style={{ fontSize: '0.8rem' }}>{log.tool_name}</td>
                                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{log.records_fetched}</td>
                                        <td style={{ fontWeight: 600, color: log.records_new > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{log.records_new}</td>
                                        <td>
                                            <span style={{ color: log.status === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600, fontSize: '0.8rem' }}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Audit Log */}
            <div className="card animate-in">
                <div className="card-header">
                    <span className="card-title">Audit Log</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select className="form-select" value={auditFilter.entity_type} onChange={e => setAuditFilter(f => ({ ...f, entity_type: e.target.value }))}
                            style={{ width: 'auto', fontSize: '0.75rem', padding: '4px 24px 4px 8px' }}>
                            <option value="">All Entities</option>
                            <option value="activity">Activities</option>
                            <option value="target">Targets</option>
                            <option value="supplier">Suppliers</option>
                            <option value="user">Users</option>
                            <option value="report_schedule">Schedules</option>
                        </select>
                        <select className="form-select" value={auditFilter.action} onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value }))}
                            style={{ width: 'auto', fontSize: '0.75rem', padding: '4px 24px 4px 8px' }}>
                            <option value="">All Actions</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="login">Login</option>
                        </select>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{auditTotal} total</span>
                    </div>
                </div>
                {auditLog.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px' }}>
                        <p>No audit log entries yet. Actions will be recorded as you use the platform.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Entity</th>
                                    <th>Action</th>
                                    <th>User</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLog.map((entry, i) => (
                                    <tr key={i}>
                                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{entry.timestamp?.slice(0, 19).replace('T', ' ')}</td>
                                        <td><span className="scope-badge scope-2" style={{ fontSize: '0.65rem' }}>{entry.entity_type}</span></td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 600,
                                                color: entry.action === 'create' ? 'var(--accent-emerald)' : entry.action === 'delete' ? 'var(--accent-rose)' : entry.action === 'login' ? 'var(--accent-blue)' : 'var(--accent-amber)',
                                            }}>
                                                {entry.action}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.8rem' }}>{entry.user_name || 'system'}</td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {entry.new_value ? (typeof entry.new_value === 'string' ? entry.new_value.slice(0, 80) : JSON.stringify(entry.new_value).slice(0, 80)) : '—'}
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

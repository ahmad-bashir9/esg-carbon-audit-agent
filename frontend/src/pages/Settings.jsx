import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';

export default function Settings() {
    const { vertical, fetchVertical } = useApp();
    const toast = useToast();
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({});
    const [schedules, setSchedules] = useState([]);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ name: '', frequency: 'weekly', framework: 'CSRD & SEC', recipients: '' });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        Promise.all([
            api.get('/verticals/config').then(j => setConfigs(j.data)),
            api.get('/company-profile').then(j => { setProfile(j.data); setProfileForm(j.data || {}); }),
            api.get('/report-schedules').then(j => setSchedules(j.data)),
            api.get('/auth/users').then(j => setUsers(j.data)).catch(() => {}),
        ]).catch(err => toast.error('Failed to load settings'))
          .finally(() => setLoading(false));
    }, [toast]);

    const handleVerticalChange = async (verticalId) => {
        setSaving(true);
        try {
            await api.put('/settings', { active_vertical: verticalId });
            await fetchVertical();
            toast.success('Vertical updated');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSave = async () => {
        setSaving(true);
        try {
            const json = await api.put('/company-profile', {
                name: profileForm.name,
                industry: profileForm.industry,
                employee_count: parseInt(profileForm.employee_count) || null,
                headquarters: profileForm.headquarters,
                revenue: parseFloat(profileForm.revenue) || null,
                floor_area_sqft: parseFloat(profileForm.floor_area_sqft) || null,
                units_produced: parseFloat(profileForm.units_produced) || null,
            });
            setProfile(json.data);
            toast.success('Company profile updated');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateSchedule = async () => {
        if (!scheduleForm.name) { toast.warning('Schedule name is required'); return; }
        try {
            await api.post('/report-schedules', scheduleForm);
            toast.success('Schedule created');
            setShowScheduleForm(false);
            setScheduleForm({ name: '', frequency: 'weekly', framework: 'CSRD & SEC', recipients: '' });
            const json = await api.get('/report-schedules');
            setSchedules(json.data);
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeleteSchedule = async (id) => {
        try {
            await api.del(`/report-schedules/${id}`);
            toast.success('Schedule removed');
            setSchedules(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleToggleSchedule = async (id, enabled) => {
        try {
            await api.put(`/report-schedules/${id}`, { enabled: enabled ? 0 : 1 });
            setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: enabled ? 0 : 1 } : s));
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Application Settings</h2>
                <p>Configure company profile, verticals, report schedules, and user management</p>
            </div>

            {/* Company Profile */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <span className="card-title">Company Profile</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Used for intensity metrics & benchmarks</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input className="form-input" value={profileForm.name || ''} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Industry</label>
                        <input className="form-input" value={profileForm.industry || ''} onChange={e => setProfileForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g., Technology" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Employee Count</label>
                        <input className="form-input" type="number" value={profileForm.employee_count || ''} onChange={e => setProfileForm(f => ({ ...f, employee_count: e.target.value }))} placeholder="e.g., 500" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Annual Revenue ($)</label>
                        <input className="form-input" type="number" value={profileForm.revenue || ''} onChange={e => setProfileForm(f => ({ ...f, revenue: e.target.value }))} placeholder="e.g., 50000000" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Floor Area (sqft)</label>
                        <input className="form-input" type="number" value={profileForm.floor_area_sqft || ''} onChange={e => setProfileForm(f => ({ ...f, floor_area_sqft: e.target.value }))} placeholder="e.g., 25000" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Headquarters</label>
                        <input className="form-input" value={profileForm.headquarters || ''} onChange={e => setProfileForm(f => ({ ...f, headquarters: e.target.value }))} placeholder="City, Country" />
                    </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </div>

            {/* Industry Vertical */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <span className="card-title">Industry Vertical</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Selecting a vertical will customize terminology and load specialized emission factors.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {Object.values(configs).map(v => (
                        <div key={v.id} className="card"
                            style={{
                                cursor: 'pointer',
                                border: vertical?.id === v.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                                background: vertical?.id === v.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-secondary)'
                            }}
                            onClick={() => handleVerticalChange(v.id)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{v.label}</span>
                                {vertical?.id === v.id && <span style={{ color: 'var(--accent-blue)', fontSize: '1.2rem' }}>✓</span>}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {v.id === 'logistics'
                                    ? 'Specialized for freight, shipping, and last-mile logistics with DEFRA 2024 factors.'
                                    : 'Balanced for general software, office-based businesses, and light manufacturing.'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Report Schedules */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <span className="card-title">Automated Report Schedules</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowScheduleForm(true)}>+ New Schedule</button>
                </div>

                {showScheduleForm && (
                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Schedule Name</label>
                                <input className="form-input" value={scheduleForm.name} onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Weekly Board Report" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Frequency</label>
                                <select className="form-select" value={scheduleForm.frequency} onChange={e => setScheduleForm(f => ({ ...f, frequency: e.target.value }))}>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Framework</label>
                                <select className="form-select" value={scheduleForm.framework} onChange={e => setScheduleForm(f => ({ ...f, framework: e.target.value }))}>
                                    <option value="CSRD & SEC">CSRD & SEC</option>
                                    <option value="CSRD">CSRD</option>
                                    <option value="SEC">SEC</option>
                                    <option value="GHG Protocol">GHG Protocol</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Recipients (emails)</label>
                                <input className="form-input" value={scheduleForm.recipients} onChange={e => setScheduleForm(f => ({ ...f, recipients: e.target.value }))} placeholder="email@company.com" />
                            </div>
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowScheduleForm(false)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={handleCreateSchedule}>Create</button>
                        </div>
                    </div>
                )}

                {schedules.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px 0' }}>No scheduled reports configured.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Frequency</th>
                                    <th>Framework</th>
                                    <th>Next Run</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td><span className="scope-badge scope-2" style={{ fontSize: '0.65rem' }}>{s.frequency}</span></td>
                                        <td style={{ fontSize: '0.8rem' }}>{s.framework}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.next_run ? new Date(s.next_run).toLocaleDateString() : '—'}</td>
                                        <td>
                                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: s.enabled ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                                                {s.enabled ? 'Active' : 'Paused'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleToggleSchedule(s.id, s.enabled)}>
                                                    {s.enabled ? 'Pause' : 'Enable'}
                                                </button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSchedule(s.id)} style={{ color: 'var(--accent-rose)' }}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User Management */}
            {users.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Users</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{users.length} registered</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td><span className={`scope-badge ${u.role === 'admin' ? 'scope-1' : 'scope-2'}`} style={{ fontSize: '0.65rem' }}>{u.role}</span></td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.created_at?.slice(0, 10)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

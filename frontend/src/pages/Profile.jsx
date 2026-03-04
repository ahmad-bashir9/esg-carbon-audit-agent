import React, { useState, useEffect } from 'react';

export default function Profile() {
    const [profile, setProfile] = useState({
        name: '',
        industry: '',
        employee_count: '',
        headquarters: '',
        reporting_framework: 'GHG Protocol'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetch('/api/profile')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) setProfile(json.data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            const json = await res.json();
            if (json.success) setMessage({ type: 'success', text: 'Company profile updated successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update company profile.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-container"><div className="loading-spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Company Profile</h2>
                <p>Manage your organization's ESG tracking settings and details.</p>
            </div>

            <div className="card" style={{ maxWidth: '600px' }}>
                {message && (
                    <div className={`alert-item ${message.type === 'error' ? 'critical' : 'warning'}`} style={{ borderLeftColor: message.type === 'success' ? 'var(--accent-emerald)' : '' }}>
                        <div className="alert-content">
                            <p className="alert-message">{message.text}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSave} style={{ display: 'grid', gap: '20px' }}>
                    <div className="form-group">
                        <label className="form-label">Company Name *</label>
                        <input type="text" className="form-input" name="name" value={profile.name} onChange={handleChange} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Industry</label>
                            <input type="text" className="form-input" name="industry" value={profile.industry || ''} onChange={handleChange} placeholder="e.g. Technology, Manufacturing" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Employee Count</label>
                            <input type="number" className="form-input" name="employee_count" value={profile.employee_count || ''} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Headquarters Location</label>
                        <input type="text" className="form-input" name="headquarters" value={profile.headquarters || ''} onChange={handleChange} placeholder="e.g. San Francisco, CA" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Primary Reporting Framework</label>
                        <select className="form-input" name="reporting_framework" value={profile.reporting_framework} onChange={handleChange}>
                            <option value="GHG Protocol">GHG Protocol (Default)</option>
                            <option value="CSRD">European CSRD</option>
                            <option value="SEC Climate Rule">SEC Climate Disclosure</option>
                            <option value="TCFD">TCFD Framework</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Profile Details'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

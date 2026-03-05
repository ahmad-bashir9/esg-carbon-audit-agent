import React, { useState, useEffect } from 'react';

export default function Settings({ vertical, onRefreshVertical }) {
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/verticals/config')
            .then(r => r.json())
            .then(j => {
                if (j.success) setConfigs(j.data);
            })
            .catch(err => console.error('Failed to load configs:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleVerticalChange = async (verticalId) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active_vertical: verticalId }),
            });
            const json = await res.json();
            if (json.success) {
                await onRefreshVertical();
            }
        } catch (err) {
            console.error('Failed to change vertical:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner"></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Application Settings</h2>
                <p>Configure industry verticals and system preferences</p>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Industry Vertical</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Selecting a vertical will re-skin the application with industry-specific terminology and load specialized emission factors.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {Object.values(configs).map(v => (
                        <div
                            key={v.id}
                            className={`card ${vertical?.id === v.id ? 'active' : ''}`}
                            style={{
                                cursor: 'pointer',
                                border: vertical?.id === v.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                                background: vertical?.id === v.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-secondary)'
                            }}
                            onClick={() => handleVerticalChange(v.id)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{v.label}</span>
                                {vertical?.id === v.id && <span style={{ color: 'var(--accent-blue)', fontSize: '1.2rem' }}>✓</span>}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {v.id === 'logistics'
                                    ? 'Specialized for freight, shipping, and last-mile logistics with DEFRA 2024 factors.'
                                    : 'Balanced for general software, office-based businesses, and light manufacturing.'}
                            </p>
                            {saving && vertical?.id === v.id && <div className="loading-spinner-sm"></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';

export default function Reports() {
    const [company, setCompany] = useState('Acme Corporation');
    const [period, setPeriod] = useState('2026-02');
    const [framework, setFramework] = useState('CSRD & SEC');
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        setGenerated(false);

        try {
            const params = new URLSearchParams({ company, period, framework });
            const res = await fetch(`/api/report?${params}`);

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ESG_Report_${company.replace(/\s+/g, '_')}_${period}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setGenerated(true);
            }
        } catch (err) {
            console.error('Report generation failed:', err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <h2>Sustainability Reports</h2>
                <p>Auto-generate PDF reports compliant with CSRD and SEC climate disclosure standards</p>
            </div>

            {/* ── Configuration ────────────────────────────────────── */}
            <div className="card animate-in" style={{ marginBottom: '28px' }}>
                <div className="card-header">
                    <span className="card-title">📄 Report Configuration</span>
                </div>
                <div className="report-config">
                    <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input className="form-input" type="text" value={company} onChange={e => setCompany(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reporting Period</label>
                        <input className="form-input" type="month" value={period} onChange={e => setPeriod(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Compliance Framework</label>
                        <select className="form-select" value={framework} onChange={e => setFramework(e.target.value)}>
                            <option value="CSRD & SEC">CSRD & SEC (Full Compliance)</option>
                            <option value="CSRD">CSRD Only</option>
                            <option value="SEC">SEC Only</option>
                            <option value="GHG Protocol">GHG Protocol Standard</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ height: '42px' }}>
                            {generating ? (
                                <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Generating Report...</>
                            ) : (
                                <>📥 Generate & Download PDF</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Success Message ──────────────────────────────────── */}
            {generated && (
                <div className="card animate-in" style={{ borderLeft: '3px solid var(--accent-emerald)', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>✅</span>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Report Generated Successfully</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Your PDF sustainability report has been downloaded. It includes Scope 1, 2, and 3 emissions
                                with full GHG Protocol methodology and {framework} compliance formatting.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Report Specs ─────────────────────────────────────── */}
            <div className="charts-grid">
                <div className="card animate-in">
                    <div className="card-header">
                        <span className="card-title">Report Contents</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { icon: '📊', title: 'Executive Summary', desc: 'High-level overview of total emissions by scope with percentage breakdowns' },
                            { icon: '🔥', title: 'Scope 1 – Direct Emissions', desc: 'Fuel combustion data from fleet vehicles and manufacturing facilities' },
                            { icon: '⚡', title: 'Scope 2 – Energy Indirect', desc: 'Purchased electricity and steam consumption across all facilities' },
                            { icon: '🌐', title: 'Scope 3 – Value Chain', desc: 'Transportation, business travel, employee commute, purchased goods, waste' },
                            { icon: '📐', title: 'Methodology & Compliance', desc: 'GHG Protocol methodology, calculation formula, and data source documentation' },
                        ].map(item => (
                            <div key={item.title} className="hotspot-item" style={{ margin: 0 }}>
                                <div style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card animate-in">
                    <div className="card-header">
                        <span className="card-title">Compliance Standards</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span className="scope-badge scope-2">CSRD</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Corporate Sustainability Reporting Directive</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                EU directive requiring detailed sustainability disclosures. Report covers ESRS E1 (Climate Change)
                                including GHG emissions, transition plans, and energy metrics.
                            </p>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span className="scope-badge scope-1">SEC</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>SEC Climate-Related Disclosures</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                US Securities and Exchange Commission regulations for climate risk disclosure.
                                Report includes Scope 1 & 2 emissions (required) and Scope 3 (encouraged).
                            </p>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span className="scope-badge scope-3">GHG</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>GHG Protocol Corporate Standard</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Core methodology: CO₂e = Activity Data × Emission Factor. Uses EPA, DEFRA,
                                and GHG Protocol emission factor databases as source references.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

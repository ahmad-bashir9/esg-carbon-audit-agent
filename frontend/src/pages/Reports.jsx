import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';

export default function Reports() {
    const toast = useToast();
    const [company, setCompany] = useState('Acme Corporation');
    const [period, setPeriod] = useState('2026-02');
    const [framework, setFramework] = useState('CSRD & SEC');
    const [generating, setGenerating] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    const handleGenerate = async () => {
        setGenerating(true);
        setGenerated(false);

        try {
            const params = new URLSearchParams({ company, period, framework });
            const res = await fetch(`/api/report?${params}`);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Report generation failed (${res.status})`);
            }

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
            toast.success('PDF report generated and downloaded');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        setScanResult(null);
        try {
            const json = await api.post('/greenwash-scan', { companyName: company, period, framework });
            setScanResult(json.data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setScanning(false);
        }
    };

    const riskColors = {
        low: 'var(--accent-emerald)',
        medium: 'var(--accent-amber)',
        high: 'var(--accent-rose)',
        critical: 'var(--accent-rose)',
    };

    const severityBg = {
        low: 'rgba(16, 185, 129, 0.1)',
        medium: 'rgba(245, 158, 11, 0.1)',
        high: 'rgba(239, 68, 68, 0.1)',
    };

    return (
        <>
            <div className="page-header">
                <h2>Sustainability Reports</h2>
                <p>Auto-generate PDF reports compliant with CSRD and SEC climate disclosure standards</p>
            </div>

            {/* Configuration */}
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
                            <option value="GHG Protocol">Greenhouse Gas Protocol Standard</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={handleScan} disabled={scanning} style={{ height: '42px' }}>
                            {scanning ? (
                                <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Scanning...</>
                            ) : (
                                'Greenwash Scan'
                            )}
                        </button>
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ height: '42px' }}>
                            {generating ? (
                                <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Generating Report...</>
                            ) : (
                                <>Generate & Download PDF</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            {generated && (
                <div className="card animate-in" style={{ borderLeft: '3px solid var(--accent-emerald)', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>✅</span>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>Report Generated Successfully</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Your PDF sustainability report has been downloaded. It includes Direct, Energy, and Supply Chain emissions
                                with full Greenhouse Gas Protocol methodology and {framework} compliance formatting.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Greenwashing Scan Results */}
            {scanResult && (
                <div className="card animate-in" style={{ marginBottom: '28px', borderLeft: `4px solid ${riskColors[scanResult.risk_level]}` }}>
                    <div className="card-header">
                        <span className="card-title">Greenwashing Risk Assessment</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: riskColors[scanResult.risk_level], color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>
                                {scanResult.risk_level} risk
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{scanResult.risk_score}/100</span>
                        </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '16px' }}>
                        {scanResult.summary}
                    </p>

                    {scanResult.findings && scanResult.findings.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {scanResult.findings.map((f, i) => (
                                <div key={i} style={{ padding: '12px', borderRadius: '8px', background: severityBg[f.severity] || 'var(--bg-tertiary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: riskColors[f.severity] || 'var(--text-muted)', color: '#fff', fontWeight: 600, textTransform: 'uppercase' }}>
                                            {f.severity}
                                        </span>
                                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{f.category}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0' }}>{f.finding}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-sky)', margin: 0 }}>Recommendation: {f.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {scanResult.missing_scope3_categories && scanResult.missing_scope3_categories.length > 0 && (
                        <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Missing Scope 3 Categories: </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{scanResult.missing_scope3_categories.join(', ')}</span>
                        </div>
                    )}

                    {scanResult.source === 'gemini' && (
                        <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
                            AI Powered
                        </span>
                    )}
                </div>
            )}

            {/* Report Specs */}
            <div className="charts-grid">
                <div className="card animate-in">
                    <div className="card-header">
                        <span className="card-title">Report Contents</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { icon: '📊', title: 'Executive Summary', desc: 'High-level overview of total emissions by category with percentage breakdowns' },
                            { icon: '🔥', title: 'Direct Emissions — Fuel & Fleet', desc: 'Fuel combustion data from fleet vehicles and manufacturing facilities' },
                            { icon: '⚡', title: 'Energy Emissions — Electricity & Heat', desc: 'Purchased electricity and steam consumption across all facilities' },
                            { icon: '🌐', title: 'Supply Chain Emissions', desc: 'Transportation, business travel, employee commute, purchased goods, waste' },
                            { icon: '📐', title: 'Methodology & Compliance', desc: 'Greenhouse Gas Protocol methodology, calculation formula, and data source documentation' },
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
                                including greenhouse gas emissions, transition plans, and energy metrics.
                            </p>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span className="scope-badge scope-1">SEC</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>SEC Climate-Related Disclosures</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                US Securities and Exchange Commission regulations for climate risk disclosure.
                                Report includes Direct & Energy emissions (required) and Supply Chain (encouraged).
                            </p>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span className="scope-badge scope-3">GHG</span>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Greenhouse Gas Protocol Corporate Standard</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Core methodology: Carbon Equivalent = Activity Data × Emission Factor. Uses EPA, DEFRA,
                                and Greenhouse Gas Protocol emission factor databases as source references.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

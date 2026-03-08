import React, { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function BoardReport() {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);

    const generate = useCallback(async () => {
        setLoading(true);
        try {
            const json = await api.get('/board-summary');
            setSummary(json.data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const trendIcon = (trend) => {
        if (trend === 'down') return { symbol: '↓', color: 'var(--accent-emerald)' };
        if (trend === 'up') return { symbol: '↑', color: 'var(--accent-rose)' };
        return { symbol: '→', color: 'var(--text-muted)' };
    };

    const handleCopy = () => {
        if (!summary) return;
        const text = [
            summary.headline,
            '',
            'EXECUTIVE SUMMARY',
            summary.summary_paragraph,
            '',
            'KEY METRICS',
            ...summary.key_metrics.map(m => `• ${m.label}: ${m.value} (${m.context})`),
            '',
            'STRATEGIC RISKS',
            ...summary.strategic_risks.map(r => `• ${r}`),
            '',
            'RECOMMENDED ACTIONS',
            ...summary.recommended_actions.map(a => `• ${a}`),
            '',
            'FORWARD COMMITMENTS',
            summary.forward_commitments,
        ].join('\n');
        navigator.clipboard.writeText(text);
        toast.success('Board summary copied to clipboard');
    };

    return (
        <>
            <div className="page-header">
                <h2>AI Board Report</h2>
                <p>Generate a one-click executive summary for investors and board of directors</p>
            </div>

            {!summary ? (
                <div className="card animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '20px', opacity: 0.7 }}>📋</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Executive Board Summary</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 24px' }}>
                        Generate a professional, investor-ready executive summary from your current emissions data. Powered by AI analysis.
                    </p>
                    <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ padding: '12px 32px', fontSize: '0.95rem' }}>
                        {loading ? (
                            <><span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> Analyzing Data...</>
                        ) : (
                            'Generate Board Report'
                        )}
                    </button>
                </div>
            ) : (
                <>
                    {/* Headline */}
                    <div className="card animate-in" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent-sky)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Board Briefing</div>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>{summary.headline}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary" onClick={handleCopy} style={{ fontSize: '0.8rem' }}>Copy</button>
                                <button className="btn btn-secondary" onClick={generate} disabled={loading} style={{ fontSize: '0.8rem' }}>
                                    {loading ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>
                        </div>
                        {summary.source === 'gemini' && (
                            <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)' }}>
                                AI Generated
                            </span>
                        )}
                    </div>

                    {/* Summary Paragraph */}
                    <div className="card animate-in" style={{ marginBottom: '24px' }}>
                        <div className="card-header"><span className="card-title">Executive Summary</span></div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.88rem', margin: 0 }}>
                            {summary.summary_paragraph}
                        </p>
                    </div>

                    <div className="charts-grid" style={{ marginBottom: '24px' }}>
                        {/* Key Metrics */}
                        <div className="card animate-in">
                            <div className="card-header"><span className="card-title">Key Metrics</span></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {summary.key_metrics.map((m, i) => {
                                    const { symbol, color } = trendIcon(m.trend);
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.context}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{m.value}</span>
                                                <span style={{ color, fontWeight: 700, fontSize: '1rem' }}>{symbol}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Risks & Actions */}
                        <div className="card animate-in">
                            <div className="card-header"><span className="card-title">Strategic Risks</span></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {summary.strategic_risks.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span style={{ color: 'var(--accent-rose)', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>!</span>
                                        <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="card-header" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                                <span className="card-title">Recommended Actions</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {summary.recommended_actions.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--gradient-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                                            {i + 1}
                                        </span>
                                        <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Forward Commitments */}
                    <div className="card animate-in" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
                        <div className="card-header"><span className="card-title">Forward Commitments</span></div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.88rem', margin: 0, fontStyle: 'italic' }}>
                            "{summary.forward_commitments}"
                        </p>
                    </div>
                </>
            )}
        </>
    );
}

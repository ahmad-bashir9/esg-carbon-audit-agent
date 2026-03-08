import React, { useState, useMemo } from 'react';

const DEADLINES = [
    {
        id: 'csrd-2026',
        framework: 'CSRD',
        title: 'CSRD First Report (Large Companies)',
        description: 'First sustainability report under CSRD for companies already subject to NFRD. Report covers FY 2025 data.',
        date: '2026-06-30',
        region: 'EU',
        severity: 'critical',
        checklist: [
            'Conduct double materiality assessment',
            'Map to ESRS E1 (Climate Change) disclosure requirements',
            'Prepare Scope 1, 2, and 3 emissions data',
            'Document transition plan aligned with 1.5°C pathway',
            'Obtain limited assurance from auditor',
            'Publish in XBRL/iXBRL digital format',
        ],
    },
    {
        id: 'sec-climate-2026',
        framework: 'SEC',
        title: 'SEC Climate Disclosure Rule — Phase 1',
        description: 'Large accelerated filers must disclose Scope 1 & 2 emissions, climate risks, and governance processes.',
        date: '2026-12-15',
        region: 'US',
        severity: 'critical',
        checklist: [
            'Disclose Scope 1 & Scope 2 GHG emissions',
            'Report material climate-related risks',
            'Describe board oversight of climate risks',
            'Document risk management processes',
            'Include financial impact estimates where material',
            'File with Annual Report (10-K)',
        ],
    },
    {
        id: 'cdp-2026',
        framework: 'CDP',
        title: 'CDP Climate Questionnaire Submission',
        description: 'Annual CDP disclosure for investor and supply chain transparency. Covers prior fiscal year.',
        date: '2026-07-24',
        region: 'Global',
        severity: 'high',
        checklist: [
            'Complete CDP Climate Change questionnaire',
            'Report Scope 1, 2, 3 emissions with methodology',
            'Disclose emission reduction targets',
            'Report on climate-related risks and opportunities',
            'Include verification/assurance statement',
            'Submit via CDP Online Response System',
        ],
    },
    {
        id: 'sbti-2026',
        framework: 'SBTi',
        title: 'SBTi Target Validation Deadline',
        description: 'Companies that committed to SBTi must submit targets for validation within 24 months of commitment.',
        date: '2026-09-30',
        region: 'Global',
        severity: 'high',
        checklist: [
            'Complete SBTi Target Setting Tool',
            'Define near-term targets (5-10 year horizon)',
            'Define long-term net-zero target',
            'Cover Scope 1 & 2 (required) and Scope 3 if >40% of total',
            'Align with 1.5°C pathway',
            'Submit target validation form to SBTi',
        ],
    },
    {
        id: 'csrd-2027',
        framework: 'CSRD',
        title: 'CSRD Expansion — Listed SMEs',
        description: 'CSRD reporting extends to listed SMEs and other large companies. Report covers FY 2026.',
        date: '2027-06-30',
        region: 'EU',
        severity: 'medium',
        checklist: [
            'Determine if company falls under expanded scope',
            'Begin data collection for FY 2026',
            'Engage sustainability reporting advisor',
            'Implement ESRS-compliant data management',
            'Plan for limited assurance requirements',
        ],
    },
    {
        id: 'tcfd-final',
        framework: 'TCFD',
        title: 'TCFD Recommendations Integration',
        description: 'TCFD recommendations are being integrated into ISSB standards (IFRS S2). Final standalone TCFD reports.',
        date: '2026-10-31',
        region: 'Global',
        severity: 'medium',
        checklist: [
            'Align disclosures with IFRS S2 standard',
            'Report on governance, strategy, risk management, metrics',
            'Include scenario analysis for climate risks',
            'Transition reporting to ISSB framework',
        ],
    },
];

function daysUntil(dateStr) {
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const severityColors = {
    critical: 'var(--accent-rose)',
    high: 'var(--accent-amber)',
    medium: 'var(--accent-sky)',
};

export default function ComplianceCalendar() {
    const [filter, setFilter] = useState('all');
    const [checkedItems, setCheckedItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem('compliance-checks') || '{}'); } catch { return {}; }
    });

    const toggleCheck = (deadlineId, idx) => {
        const key = `${deadlineId}-${idx}`;
        const next = { ...checkedItems, [key]: !checkedItems[key] };
        setCheckedItems(next);
        localStorage.setItem('compliance-checks', JSON.stringify(next));
    };

    const filteredDeadlines = useMemo(() => {
        let dl = [...DEADLINES].sort((a, b) => new Date(a.date) - new Date(b.date));
        if (filter !== 'all') dl = dl.filter(d => d.framework === filter);
        return dl;
    }, [filter]);

    const frameworks = [...new Set(DEADLINES.map(d => d.framework))];

    return (
        <>
            <div className="page-header">
                <h2>Compliance Deadline Calendar</h2>
                <p>Track CSRD, SEC, CDP, SBTi, and TCFD reporting deadlines with preparation checklists</p>
            </div>

            {/* Summary Cards */}
            <div className="kpi-grid" style={{ marginBottom: '24px' }}>
                {(() => {
                    const upcoming = DEADLINES.filter(d => daysUntil(d.date) > 0 && daysUntil(d.date) <= 90);
                    const overdue = DEADLINES.filter(d => daysUntil(d.date) < 0);
                    const next = DEADLINES.filter(d => daysUntil(d.date) > 0).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
                    const totalChecks = DEADLINES.reduce((s, d) => s + d.checklist.length, 0);
                    const doneChecks = Object.values(checkedItems).filter(Boolean).length;
                    return (
                        <>
                            <div className="kpi-card">
                                <div className="kpi-label">Next Deadline</div>
                                <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{next ? daysUntil(next.date) + 'd' : '--'}</div>
                                <div className="kpi-sub">{next ? next.framework : 'None'}</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Due in 90 Days</div>
                                <div className="kpi-value" style={{ color: upcoming.length > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>{upcoming.length}</div>
                                <div className="kpi-sub">deadlines approaching</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Overdue</div>
                                <div className="kpi-value" style={{ color: overdue.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{overdue.length}</div>
                                <div className="kpi-sub">missed deadlines</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Prep Progress</div>
                                <div className="kpi-value">{totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0}%</div>
                                <div className="kpi-sub">{doneChecks}/{totalChecks} tasks done</div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All</button>
                {frameworks.map(f => (
                    <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>
                ))}
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredDeadlines.map(dl => {
                    const days = daysUntil(dl.date);
                    const isOverdue = days < 0;
                    const isUrgent = days >= 0 && days <= 60;
                    const doneCount = dl.checklist.filter((_, idx) => checkedItems[`${dl.id}-${idx}`]).length;
                    const progress = (doneCount / dl.checklist.length) * 100;

                    return (
                        <div key={dl.id} className="card animate-in" style={{ borderLeft: `4px solid ${severityColors[dl.severity]}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span className="scope-badge" style={{ background: severityColors[dl.severity], color: '#fff', fontSize: '0.65rem' }}>{dl.framework}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{dl.title}</span>
                                        <span className="scope-badge" style={{ fontSize: '0.6rem' }}>{dl.region}</span>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{dl.description}</p>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.3rem', color: isOverdue ? 'var(--accent-rose)' : isUrgent ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                                        {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d`}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(dl.date)}</div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Preparation</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doneCount}/{dl.checklist.length}</span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--accent-emerald)' : 'var(--gradient-primary)', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                                {dl.checklist.map((item, idx) => {
                                    const checked = !!checkedItems[`${dl.id}-${idx}`];
                                    return (
                                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', background: checked ? 'rgba(16, 185, 129, 0.08)' : 'transparent', transition: 'background 0.2s' }}>
                                            <input type="checkbox" checked={checked} onChange={() => toggleCheck(dl.id, idx)}
                                                style={{ accentColor: 'var(--accent-emerald)', width: '16px', height: '16px', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.78rem', color: checked ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: checked ? 'line-through' : 'none' }}>
                                                {item}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

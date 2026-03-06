import React from 'react';
import { useNavigate } from 'react-router-dom';

const PLATFORM_FEATURES = [
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
        title: 'Real-Time Carbon Dashboard',
        description: 'Monitor your organization\'s carbon footprint across all three emission scopes in real time. Visualize emissions by category, facility, department, and time period with interactive charts and drill-down analytics.',
        color: '#3B82F6',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
        ),
        title: 'AI-Powered Carbon Intelligence',
        description: 'Ask questions in plain English and get instant answers about your emissions data. Powered by Google Gemini, the AI assistant provides actionable insights, anomaly explanations, and reduction strategy recommendations.',
        color: '#8B5CF6',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
            </svg>
        ),
        title: 'SBTi-Aligned Reduction Targets',
        description: 'Set Science-Based Targets with base year baselines, target percentages, and milestone tracking. Visualize your planned trajectory against actual performance with gap analysis and on-track / off-track indicators.',
        color: '#10B981',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        title: 'Automated Anomaly Detection',
        description: 'A continuous auditor agent monitors emission patterns against rolling baselines. When unusual spikes or drops are detected, alerts are raised with severity ratings, AI-generated root cause analysis, and corrective recommendations.',
        color: '#F43F5E',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
        ),
        title: 'What-If Decarbonization Simulator',
        description: 'Model the impact of strategies like renewable energy adoption, fleet electrification, rail modal shift, and remote work policies. Get AI-powered cost impact forecasts, risk assessments, and ROI projections before committing resources.',
        color: '#F97316',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
        ),
        title: 'Supply Chain Carbon Scoring',
        description: 'Track, rate, and rank suppliers by their carbon footprint. Assign A-through-F risk scores, monitor emissions by vendor, and identify high-risk supply chain partners that need engagement on decarbonization.',
        color: '#06B6D4',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
        ),
        title: 'Regulatory Disclosure Reports',
        description: 'Generate board-ready PDF reports aligned with CSRD, SEC Climate Disclosure, and Greenhouse Gas Protocol frameworks. Reports include executive summaries, scope breakdowns, pie charts, and industry-specific annexes.',
        color: '#F59E0B',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
        title: 'Industry Benchmarking',
        description: 'Compare your carbon intensity metrics against industry peers using CDP and EPA benchmark data. See how your emissions per employee, per revenue, and scope distribution stack up against the median for your sector.',
        color: '#EC4899',
    },
];

const WHO_CAN_USE = [
    { role: 'Sustainability Officers', desc: 'Track, report, and reduce organizational carbon emissions with audit-grade data lineage.' },
    { role: 'CFOs & Board Members', desc: 'Receive automated disclosure reports and benchmark performance for investor communications.' },
    { role: 'Operations Managers', desc: 'Identify emission hotspots across facilities and departments to prioritize efficiency projects.' },
    { role: 'Supply Chain Teams', desc: 'Score and rank vendors by carbon risk to meet Scope 3 reporting requirements.' },
    { role: 'ESG Consultants', desc: 'Use the platform as a turnkey audit tool for clients across multiple industry verticals.' },
    { role: 'Compliance Teams', desc: 'Meet CSRD, SEC, and GHG Protocol reporting deadlines with scheduled, automated reports.' },
];

const BENEFITS = [
    { stat: '3', unit: 'Scopes', label: 'Full GHG Protocol coverage across direct, energy, and supply chain emissions' },
    { stat: '< 5', unit: 'min', label: 'From raw data ingestion to board-ready PDF report generation' },
    { stat: '95%', unit: 'Confidence', label: 'Audit-grade data lineage with MCP-verified source traceability' },
    { stat: '24/7', unit: 'Monitoring', label: 'Continuous anomaly detection with AI root-cause analysis' },
];

const TECH_STACK = [
    { name: 'React 18', category: 'Frontend' },
    { name: 'Vite 5', category: 'Build' },
    { name: 'Recharts', category: 'Visualization' },
    { name: 'Node.js (ESM)', category: 'Backend' },
    { name: 'Express 4', category: 'API' },
    { name: 'SQLite', category: 'Database' },
    { name: 'Google Gemini', category: 'AI' },
    { name: 'Model Context Protocol', category: 'Integration' },
    { name: 'PDFKit + D3', category: 'Reports' },
    { name: 'JWT + bcrypt', category: 'Auth' },
];

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="animate-in">
            {/* Hero */}
            <div className="about-hero">
                <div className="about-hero-glow" />
                <div className="about-hero-content">
                    <div className="about-hero-badge">Open-Source ESG Platform</div>
                    <h1 className="about-hero-title">
                        The intelligent carbon audit platform for <span className="about-gradient-text">modern enterprises</span>
                    </h1>
                    <p className="about-hero-subtitle">
                        CarbonLens gives sustainability teams a single pane of glass to measure, analyze, report, and reduce greenhouse gas emissions 
                        across all three scopes — powered by AI intelligence and connected to your enterprise systems via the Model Context Protocol.
                    </p>
                    <div className="about-hero-actions">
                        <button className="btn btn-primary" onClick={() => navigate('/')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                            Open Dashboard
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
                            View Reports
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Numbers */}
            <div className="about-stats-row">
                {BENEFITS.map((b, i) => (
                    <div key={i} className="about-stat-card">
                        <div className="about-stat-number">
                            {b.stat}<span className="about-stat-unit">{b.unit}</span>
                        </div>
                        <div className="about-stat-label">{b.label}</div>
                    </div>
                ))}
            </div>

            {/* What Is CarbonLens */}
            <div className="card about-section">
                <div className="about-section-header">
                    <h2>What is CarbonLens?</h2>
                </div>
                <div className="about-body-text">
                    <p>
                        CarbonLens is a full-stack ESG Carbon Audit Agent designed to help organizations measure, monitor, and manage their
                        greenhouse gas emissions. It implements the <strong>GHG Protocol Corporate Standard</strong> — the world's most widely used
                        greenhouse gas accounting framework — to categorize emissions into three scopes:
                    </p>
                    <div className="about-scope-grid">
                        <div className="about-scope-card" style={{ borderTopColor: '#F97316' }}>
                            <div className="about-scope-label" style={{ color: '#F97316' }}>Direct Emissions</div>
                            <div className="about-scope-num" style={{ color: '#F97316' }}>Scope 1</div>
                            <p>Emissions from sources owned or controlled by your organization — fuel combustion, company vehicles, on-site manufacturing, and refrigerant leaks.</p>
                        </div>
                        <div className="about-scope-card" style={{ borderTopColor: '#3B82F6' }}>
                            <div className="about-scope-label" style={{ color: '#3B82F6' }}>Energy Emissions</div>
                            <div className="about-scope-num" style={{ color: '#3B82F6' }}>Scope 2</div>
                            <p>Indirect emissions from purchased electricity, steam, heating, and cooling consumed by your facilities.</p>
                        </div>
                        <div className="about-scope-card" style={{ borderTopColor: '#10B981' }}>
                            <div className="about-scope-label" style={{ color: '#10B981' }}>Supply Chain</div>
                            <div className="about-scope-num" style={{ color: '#10B981' }}>Scope 3</div>
                            <p>All other indirect emissions across your value chain — purchased goods, business travel, employee commuting, downstream transport, and waste disposal.</p>
                        </div>
                    </div>
                    <p>
                        Unlike spreadsheet-based carbon accounting, CarbonLens connects directly to your enterprise systems (ERP, CRM) via the
                        <strong> Model Context Protocol (MCP)</strong>, ingests activity data automatically, applies verified emission factors, and produces
                        audit-grade calculations with full data lineage — every number is traceable back to its source.
                    </p>
                </div>
            </div>

            {/* Platform Features */}
            <div className="about-section" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                <div className="about-section-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2>Platform Capabilities</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px', margin: '8px auto 0' }}>
                        Everything your team needs to go from raw operational data to regulatory disclosure
                    </p>
                </div>
                <div className="about-features-grid">
                    {PLATFORM_FEATURES.map((f, i) => (
                        <div key={i} className="about-feature-card">
                            <div className="about-feature-icon-wrap" style={{ background: `${f.color}15`, color: f.color }}>
                                {f.icon}
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Who Can Use */}
            <div className="card about-section">
                <div className="about-section-header">
                    <h2>Who Is It For?</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        CarbonLens is built for every stakeholder involved in your organization's sustainability journey
                    </p>
                </div>
                <div className="about-roles-grid">
                    {WHO_CAN_USE.map((w, i) => (
                        <div key={i} className="about-role-item">
                            <div className="about-role-bullet">{i + 1}</div>
                            <div>
                                <div className="about-role-name">{w.role}</div>
                                <div className="about-role-desc">{w.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How It Works */}
            <div className="card about-section">
                <div className="about-section-header">
                    <h2>How It Works</h2>
                </div>
                <div className="about-flow">
                    {[
                        { step: '1', title: 'Connect', desc: 'Link your ERP & CRM systems via MCP, upload CSV files, or enter data manually.' },
                        { step: '2', title: 'Calculate', desc: 'The emission engine applies GHG Protocol factors to convert activity data into CO2e.' },
                        { step: '3', title: 'Analyze', desc: 'AI surfaces insights, the auditor flags anomalies, and dashboards visualize everything.' },
                        { step: '4', title: 'Report', desc: 'Generate CSRD/SEC-compliant PDFs and track progress against SBTi reduction targets.' },
                    ].map((s, i) => (
                        <div key={i} className="about-flow-step">
                            <div className="about-flow-num">{s.step}</div>
                            <div className="about-flow-connector" />
                            <h4>{s.title}</h4>
                            <p>{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tech Stack */}
            <div className="card about-section">
                <div className="about-section-header">
                    <h2>Technology Stack</h2>
                </div>
                <div className="about-tech-grid">
                    {TECH_STACK.map((t, i) => (
                        <div key={i} className="about-tech-chip">
                            <span className="about-tech-name">{t.name}</span>
                            <span className="about-tech-cat">{t.category}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Graceful Degradation */}
            <div className="card about-section">
                <div className="about-section-header">
                    <h2>Designed for Resilience</h2>
                </div>
                <div className="about-body-text">
                    <p>
                        CarbonLens follows a <strong>graceful degradation</strong> architecture. Every AI-powered feature has a deterministic fallback:
                    </p>
                    <ul className="about-list">
                        <li><strong>No Gemini API key?</strong> Emission factor matching falls back to keyword-based classification. Insights use rule-based analysis. The full platform remains functional.</li>
                        <li><strong>MCP servers unreachable?</strong> Data can be uploaded via CSV or entered manually. The sync scheduler retries automatically every 6 hours.</li>
                        <li><strong>No internet?</strong> SQLite is a local, file-based database. All calculations, charts, and reports work entirely offline.</li>
                    </ul>
                </div>
            </div>

            {/* CTA */}
            <div className="about-cta">
                <h2>Ready to start?</h2>
                <p>Open the dashboard and explore your organization's carbon footprint today.</p>
                <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}

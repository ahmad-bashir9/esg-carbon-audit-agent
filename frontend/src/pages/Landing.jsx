import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function AnimatedCounter({ end, duration = 2000, suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const startTime = Date.now();
                const tick = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.round(eased * end));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                tick();
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const FEATURES = [
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
        title: 'Real-Time Carbon Tracking',
        description: 'Monitor Scope 1, 2 & 3 emissions in real-time across all facilities, departments, and supply chains.',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
        ),
        title: 'AI-Powered Insights',
        description: 'Ask questions in plain English. Our Gemini-powered AI generates SQL queries and answers from your actual data.',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        ),
        title: 'One-Click Compliance Reports',
        description: 'Auto-generate PDF reports aligned with CSRD, SEC, CDP, and GHG Protocol standards in seconds.',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 010 4H8" />
                <path d="M12 18V6" />
            </svg>
        ),
        title: 'Carbon Budget Autopilot',
        description: 'Set annual carbon budgets, track monthly burn rate, and get AI-projected year-end forecasts with alerts.',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        title: 'Greenwashing Risk Scanner',
        description: 'AI audits your report for missing data, methodology gaps, and disclosure risks before you publish.',
    },
    {
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        ),
        title: 'Compliance Deadline Calendar',
        description: 'Never miss a CSRD, SEC, or SBTi deadline. Interactive checklists track your preparation progress.',
    },
];

const SCOPES = [
    { num: '1', label: 'Direct Emissions', color: '#F97316', description: 'Fuel combustion, company vehicles, on-site manufacturing, and refrigerant leaks from sources your organization owns or controls.' },
    { num: '2', label: 'Energy Emissions', color: '#3B82F6', description: 'Purchased electricity, steam, heating, and cooling consumed by your facilities — indirect but trackable.' },
    { num: '3', label: 'Supply Chain', color: '#10B981', description: 'Purchased goods, business travel, employee commuting, downstream transport, and waste disposal across your value chain.' },
];

const WHO_ITS_FOR = [
    { role: 'Sustainability Officers', desc: 'Track, report, and reduce organizational carbon emissions with audit-grade data lineage.' },
    { role: 'CFOs & Board Members', desc: 'Receive automated disclosure reports and benchmark performance for investor communications.' },
    { role: 'Operations Managers', desc: 'Identify emission hotspots across facilities and departments to prioritize efficiency projects.' },
    { role: 'Supply Chain Teams', desc: 'Score and rank vendors by carbon risk to meet Scope 3 reporting requirements.' },
    { role: 'ESG Consultants', desc: 'Use the platform as a turnkey audit tool for clients across multiple industry verticals.' },
    { role: 'Compliance Teams', desc: 'Meet CSRD, SEC, and GHG Protocol reporting deadlines with scheduled, automated reports.' },
];

const TECH_STACK = [
    { name: 'React 18', category: 'Frontend' },
    { name: 'Vite 5', category: 'Build' },
    { name: 'Recharts', category: 'Visualization' },
    { name: 'Node.js (ESM)', category: 'Backend' },
    { name: 'Express 4', category: 'API' },
    { name: 'Neon Postgres', category: 'Database' },
    { name: 'Google Gemini', category: 'AI' },
    { name: 'Model Context Protocol', category: 'Integration' },
    { name: 'PDFKit + D3', category: 'Reports' },
    { name: 'JWT + bcrypt', category: 'Auth' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Connect Your Data', description: 'Upload CSVs or connect via MCP to your ERP and CRM systems. Auto-map activity data to GHG Protocol categories.' },
    { step: '02', title: 'AI Calculates Emissions', description: 'Gemini AI matches emission factors, computes Scope 1/2/3, and flags anomalies with confidence scores.' },
    { step: '03', title: 'Audit & Report', description: 'Run greenwashing scans, generate board summaries, and export compliance-ready PDF reports in one click.' },
];

const TESTIMONIALS = [
    { name: 'Sarah Chen', role: 'VP Sustainability, TechFlow Inc.', quote: 'CarbonLens cut our reporting time from 3 weeks to 2 days. The greenwashing scanner caught gaps we completely missed.', avatar: 'SC' },
    { name: 'Marcus Reiter', role: 'CFO, GreenLogistics GmbH', quote: 'The carbon budget autopilot gives our board real-time visibility. We went from quarterly guessing to daily tracking.', avatar: 'MR' },
    { name: 'Priya Sharma', role: 'ESG Director, Axial Energy', quote: 'AI-powered natural language queries let our entire team explore carbon data without learning SQL or Excel.', avatar: 'PS' },
];

const PLANS = [
    {
        name: 'Starter',
        price: 'Free',
        period: '',
        description: 'For small teams starting their carbon journey',
        features: ['Scope 1 & 2 tracking', 'Up to 500 activity records', 'Basic PDF reports', 'AI chat assistant', '1 user'],
        cta: 'Get Started Free',
        highlighted: false,
    },
    {
        name: 'Professional',
        price: '$299',
        period: '/month',
        description: 'For growing companies with compliance needs',
        features: ['Full Scope 1, 2 & 3', 'Unlimited activity records', 'CSRD & SEC compliance reports', 'Greenwashing scanner', 'Carbon budget autopilot', 'Board report generator', 'Up to 10 users', 'Email support'],
        cta: 'Start Free Trial',
        highlighted: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'For large organizations with complex needs',
        features: ['Everything in Professional', 'MCP server integration', 'Supplier carbon scoring', 'Custom emission factors', 'SSO & RBAC', 'Dedicated success manager', 'SLA guarantee', 'On-premise option'],
        cta: 'Contact Sales',
        highlighted: false,
    },
];

export default function Landing() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="landing">
            {/* ─── Navbar ─── */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div className="landing-nav-inner">
                    <Link to="/" className="landing-logo">
                        <img src="/logo.png" alt="CarbonLens" />
                        <span>CarbonLens</span>
                    </Link>
                    <div className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
                        <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
                        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
                        <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                        <Link to="/login" className="landing-nav-login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                        <Link to="/signup" className="landing-nav-cta" onClick={() => setMobileMenuOpen(false)}>Start Free</Link>
                    </div>
                    <button className="landing-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            {/* ─── Hero ─── */}
            <section className="landing-hero">
                <div className="landing-hero-bg">
                    <div className="landing-hero-orb landing-hero-orb-1" />
                    <div className="landing-hero-orb landing-hero-orb-2" />
                    <div className="landing-hero-orb landing-hero-orb-3" />
                    <div className="landing-hero-grid" />
                </div>
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <span className="landing-hero-badge-dot" />
                        AI-Powered ESG Platform
                    </div>
                    <h1 className="landing-hero-title">
                        The carbon audit platform<br />
                        <span className="landing-hero-gradient">built for compliance.</span>
                    </h1>
                    <p className="landing-hero-subtitle">
                        Track Scope 1, 2 & 3 emissions. Generate CSRD & SEC reports in one click.
                        Powered by Gemini AI, trusted by sustainability teams worldwide.
                    </p>
                    <div className="landing-hero-actions">
                        <Link to="/signup" className="landing-btn-primary">
                            Start Free Trial
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </Link>
                        <a href="#features" className="landing-btn-secondary">
                            See Features
                        </a>
                    </div>
                    <div className="landing-hero-stats">
                        <div className="landing-hero-stat">
                            <strong><AnimatedCounter end={50} suffix="K+" /></strong>
                            <span>Emission Records Processed</span>
                        </div>
                        <div className="landing-hero-stat-divider" />
                        <div className="landing-hero-stat">
                            <strong><AnimatedCounter end={98} suffix="%" /></strong>
                            <span>Compliance Accuracy</span>
                        </div>
                        <div className="landing-hero-stat-divider" />
                        <div className="landing-hero-stat">
                            <strong><AnimatedCounter end={10} suffix="x" /></strong>
                            <span>Faster Reporting</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Logos strip ─── */}
            <section className="landing-logos">
                <p>Trusted by forward-thinking sustainability teams</p>
                <div className="landing-logos-row">
                    {['TechFlow', 'GreenLogistics', 'Axial Energy', 'NovaChem', 'EcoShip', 'Vistara Corp'].map(name => (
                        <div key={name} className="landing-logo-pill">{name}</div>
                    ))}
                </div>
            </section>

            {/* ─── Features ─── */}
            <section className="landing-section" id="features">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Features</span>
                        <h2>Everything you need for<br />carbon compliance</h2>
                        <p>From data ingestion to board-ready reports, CarbonLens covers the full ESG audit lifecycle.</p>
                    </div>
                    <div className="landing-features-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="landing-feature-card">
                                <div className="landing-feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── How It Works ─── */}
            <section className="landing-section landing-section-alt" id="how-it-works">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">How It Works</span>
                        <h2>From raw data to<br />audit-ready reports</h2>
                        <p>Three steps to full carbon transparency. No PhD in sustainability required.</p>
                    </div>
                    <div className="landing-steps">
                        {HOW_IT_WORKS.map((s, i) => (
                            <div key={i} className="landing-step">
                                <div className="landing-step-number">{s.step}</div>
                                <div className="landing-step-content">
                                    <h3>{s.title}</h3>
                                    <p>{s.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Scope Explainer ─── */}
            <section className="landing-section" id="scopes">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">GHG Protocol</span>
                        <h2>Full coverage across<br />all three emission scopes</h2>
                        <p>CarbonLens implements the GHG Protocol Corporate Standard — the world's most widely used greenhouse gas accounting framework.</p>
                    </div>
                    <div className="landing-scopes">
                        {SCOPES.map((s, i) => (
                            <div key={i} className="landing-scope-card" style={{ borderTopColor: s.color }}>
                                <div className="landing-scope-num" style={{ color: s.color }}>Scope {s.num}</div>
                                <h3 style={{ color: s.color }}>{s.label}</h3>
                                <p>{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Who It's For ─── */}
            <section className="landing-section landing-section-alt" id="who">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Built For</span>
                        <h2>Every stakeholder in your<br />sustainability journey</h2>
                    </div>
                    <div className="landing-roles-grid">
                        {WHO_ITS_FOR.map((w, i) => (
                            <div key={i} className="landing-role-card">
                                <div className="landing-role-num">{i + 1}</div>
                                <div>
                                    <h4>{w.role}</h4>
                                    <p>{w.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Tech Stack ─── */}
            <section className="landing-section">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Technology</span>
                        <h2>Built on a modern,<br />production-grade stack</h2>
                        <p>Every AI feature has a deterministic fallback. No API key? No internet? CarbonLens keeps working.</p>
                    </div>
                    <div className="landing-tech-row">
                        {TECH_STACK.map((t, i) => (
                            <div key={i} className="landing-tech-chip">
                                <span className="landing-tech-name">{t.name}</span>
                                <span className="landing-tech-cat">{t.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Testimonials ─── */}
            <section className="landing-section">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Testimonials</span>
                        <h2>Loved by sustainability teams</h2>
                    </div>
                    <div className="landing-testimonials">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="landing-testimonial">
                                <p>"{t.quote}"</p>
                                <div className="landing-testimonial-author">
                                    <div className="landing-testimonial-avatar">{t.avatar}</div>
                                    <div>
                                        <strong>{t.name}</strong>
                                        <span>{t.role}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Pricing ─── */}
            <section className="landing-section landing-section-alt" id="pricing">
                <div className="landing-section-inner">
                    <div className="landing-section-header">
                        <span className="landing-section-tag">Pricing</span>
                        <h2>Simple, transparent pricing</h2>
                        <p>Start free. Scale as your sustainability program grows.</p>
                    </div>
                    <div className="landing-pricing">
                        {PLANS.map((plan, i) => (
                            <div key={i} className={`landing-plan ${plan.highlighted ? 'highlighted' : ''}`}>
                                {plan.highlighted && <div className="landing-plan-badge">Most Popular</div>}
                                <h3>{plan.name}</h3>
                                <div className="landing-plan-price">
                                    <span className="landing-plan-amount">{plan.price}</span>
                                    {plan.period && <span className="landing-plan-period">{plan.period}</span>}
                                </div>
                                <p className="landing-plan-desc">{plan.description}</p>
                                <ul className="landing-plan-features">
                                    {plan.features.map((f, j) => (
                                        <li key={j}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className={`landing-plan-cta ${plan.highlighted ? 'primary' : ''}`}>
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Final CTA ─── */}
            <section className="landing-cta">
                <div className="landing-cta-inner">
                    <h2>Ready to decarbonize with confidence?</h2>
                    <p>Join hundreds of sustainability teams using CarbonLens to track, report, and reduce emissions.</p>
                    <div className="landing-hero-actions" style={{ justifyContent: 'center' }}>
                        <Link to="/signup" className="landing-btn-primary">
                            Start Free Trial
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </Link>
                        <Link to="/login" className="landing-btn-secondary">
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-brand">
                        <div className="landing-logo">
                            <img src="/logo.png" alt="CarbonLens" />
                            <span>CarbonLens</span>
                        </div>
                        <p>AI-powered carbon audit intelligence for modern sustainability teams.</p>
                    </div>
                    <div className="landing-footer-links">
                        <div>
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#pricing">Pricing</a>
                            <a href="#how-it-works">How It Works</a>
                        </div>
                        <div>
                            <h4>Compliance</h4>
                            <span>CSRD</span>
                            <span>SEC Climate</span>
                            <span>GHG Protocol</span>
                        </div>
                        <div>
                            <h4>Company</h4>
                            <Link to="/login">Sign In</Link>
                            <Link to="/signup">Register</Link>
                        </div>
                    </div>
                </div>
                <div className="landing-footer-bottom">
                    <span>&copy; {new Date().getFullYear()} CarbonLens. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}

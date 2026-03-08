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
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
        title: 'Real-Time Carbon Tracking',
        description: 'Monitor Scope 1, 2 & 3 emissions across all facilities, departments, and supply chains with live dashboards.',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
        title: 'AI-Powered Insights',
        description: 'Ask questions in plain English. Gemini AI generates SQL, queries your data, and delivers instant answers.',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
        title: 'One-Click Compliance Reports',
        description: 'Auto-generate audit-ready PDF reports aligned with CSRD, SEC, CDP, and GHG Protocol in seconds.',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 010 4H8" /><path d="M12 18V6" /></svg>,
        title: 'Carbon Budget Autopilot',
        description: 'Set annual budgets, track monthly burn, and get AI-projected year-end forecasts with alerts.',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
        title: 'Greenwashing Risk Scanner',
        description: 'AI audits reports for missing data, methodology gaps, and disclosure risks before publication.',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
        title: 'Compliance Deadline Calendar',
        description: 'Never miss a CSRD, SEC, or SBTi deadline. Checklists track your preparation progress.',
    },
];

const SCOPES = [
    { num: '1', label: 'Direct Emissions', color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #F59E0B)', description: 'Fuel combustion, company vehicles, on-site manufacturing, and refrigerant leaks from sources you own or control.' },
    { num: '2', label: 'Energy Emissions', color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', description: 'Purchased electricity, steam, heating, and cooling consumed across your facilities.' },
    { num: '3', label: 'Supply Chain', color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #06B6D4)', description: 'Purchased goods, business travel, employee commuting, downstream transport, and waste across your value chain.' },
];

const WHO_ITS_FOR = [
    { role: 'Sustainability Officers', desc: 'Track, report, and reduce emissions with audit-grade data lineage.' },
    { role: 'CFOs & Board Members', desc: 'Receive automated disclosure reports and performance benchmarks.' },
    { role: 'Operations Managers', desc: 'Identify hotspots across facilities to prioritize efficiency projects.' },
    { role: 'Supply Chain Teams', desc: 'Score and rank vendors by carbon risk for Scope 3 compliance.' },
    { role: 'ESG Consultants', desc: 'Turnkey audit tool for clients across multiple industry verticals.' },
    { role: 'Compliance Teams', desc: 'Meet CSRD, SEC, and GHG Protocol deadlines with automated reports.' },
];

const TECH_STACK = [
    { name: 'React 18', category: 'Frontend' },
    { name: 'Vite 5', category: 'Build' },
    { name: 'Recharts', category: 'Charts' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'Express', category: 'API' },
    { name: 'Neon Postgres', category: 'Database' },
    { name: 'Google Gemini', category: 'AI' },
    { name: 'MCP SDK', category: 'Integration' },
    { name: 'PDFKit', category: 'Reports' },
    { name: 'JWT', category: 'Auth' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Connect Your Data', description: 'Upload CSVs or connect via MCP to your ERP and CRM. Activity data auto-maps to GHG Protocol categories.' },
    { step: '02', title: 'AI Calculates Emissions', description: 'Gemini AI matches emission factors, computes Scope 1/2/3, and flags anomalies with confidence scores.' },
    { step: '03', title: 'Audit & Report', description: 'Run greenwashing scans, generate board summaries, and export compliance-ready PDF reports in one click.' },
];

const TESTIMONIALS = [
    { name: 'Sarah Chen', role: 'VP Sustainability, TechFlow', quote: 'CarbonLens cut our reporting time from 3 weeks to 2 days. The greenwashing scanner caught gaps we completely missed.', avatar: 'SC' },
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
        period: '/mo',
        description: 'For growing companies with compliance needs',
        features: ['Full Scope 1, 2 & 3', 'Unlimited records', 'CSRD & SEC reports', 'Greenwashing scanner', 'Carbon budget autopilot', 'Board report generator', 'Up to 10 users', 'Priority support'],
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

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    return (
        <div className="lp">
            {/* ─── Nav ─── */}
            <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
                <div className="lp-container lp-nav__inner">
                    <Link to="/" className="lp-brand">
                        <img src="/logo.png" alt="CarbonLens" />
                        <span>CarbonLens</span>
                    </Link>
                    <div className={`lp-nav__links${mobileMenuOpen ? ' lp-nav__links--open' : ''}`}>
                        <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
                        <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
                        <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                        <div className="lp-nav__auth">
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
                            <Link to="/signup" className="lp-btn lp-btn--sm" onClick={() => setMobileMenuOpen(false)}>Start Free</Link>
                        </div>
                    </div>
                    <button className={`lp-hamburger${mobileMenuOpen ? ' lp-hamburger--open' : ''}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                        <span /><span /><span />
                    </button>
                </div>
            </nav>

            {/* ─── Hero ─── */}
            <section className="lp-hero">
                <div className="lp-hero__bg">
                    <div className="lp-hero__orb lp-hero__orb--1" />
                    <div className="lp-hero__orb lp-hero__orb--2" />
                    <div className="lp-hero__orb lp-hero__orb--3" />
                    <div className="lp-hero__grid" />
                </div>
                <div className="lp-hero__split">
                    <div className="lp-hero__text">
                        <div className="lp-badge">
                            <span className="lp-badge__dot" />
                            AI-Powered ESG Platform
                        </div>
                        <h1 className="lp-hero__title">
                            The carbon audit platform <span className="lp-gradient-text">built for compliance.</span>
                        </h1>
                        <p className="lp-hero__sub">
                            Track Scope 1, 2 & 3 emissions. Generate CSRD & SEC reports in one click. Powered by Gemini AI.
                        </p>
                        <div className="lp-hero__actions">
                            <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                                Start Free Trial
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                            </Link>
                            <a href="#features" className="lp-btn lp-btn--ghost lp-btn--lg">See Features</a>
                        </div>
                        <div className="lp-hero__stats">
                            <div className="lp-stat"><strong><AnimatedCounter end={50} suffix="K+" /></strong><span>Records Processed</span></div>
                            <div className="lp-stat__sep" />
                            <div className="lp-stat"><strong><AnimatedCounter end={98} suffix="%" /></strong><span>Compliance Accuracy</span></div>
                            <div className="lp-stat__sep" />
                            <div className="lp-stat"><strong><AnimatedCounter end={10} suffix="x" /></strong><span>Faster Reporting</span></div>
                        </div>
                    </div>
                    <div className="lp-hero__visual">
                        <div className="lp-mockup">
                            <div className="lp-mockup__bar">
                                <span /><span /><span />
                                <div className="lp-mockup__tab">Dashboard</div>
                            </div>
                            <div className="lp-mockup__body">
                                <div className="lp-mockup__kpis">
                                    <div className="lp-mockup__kpi">
                                        <div className="lp-mockup__kpi-label">Total Emissions</div>
                                        <div className="lp-mockup__kpi-value">24,850<span>kg</span></div>
                                        <div className="lp-mockup__kpi-bar"><div style={{ width: '72%' }} /></div>
                                    </div>
                                    <div className="lp-mockup__kpi">
                                        <div className="lp-mockup__kpi-label">Scope 1</div>
                                        <div className="lp-mockup__kpi-value" style={{ color: '#f97316' }}>8,120<span>kg</span></div>
                                        <div className="lp-mockup__kpi-bar"><div style={{ width: '45%', background: 'linear-gradient(90deg, #f97316, #f59e0b)' }} /></div>
                                    </div>
                                    <div className="lp-mockup__kpi">
                                        <div className="lp-mockup__kpi-label">Scope 2</div>
                                        <div className="lp-mockup__kpi-value" style={{ color: '#3b82f6' }}>6,430<span>kg</span></div>
                                        <div className="lp-mockup__kpi-bar"><div style={{ width: '35%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} /></div>
                                    </div>
                                </div>
                                <div className="lp-mockup__chart">
                                    <svg viewBox="0 0 200 80" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M0 65 Q25 55 50 48 T100 35 T150 28 T200 20" fill="none" stroke="#3b82f6" strokeWidth="2" />
                                        <path d="M0 65 Q25 55 50 48 T100 35 T150 28 T200 20 L200 80 L0 80Z" fill="url(#chartFill)" />
                                        <path d="M0 60 Q30 62 60 55 T120 50 T180 45 L200 42" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                                    </svg>
                                    <div className="lp-mockup__chart-labels">
                                        <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
                                    </div>
                                </div>
                                <div className="lp-mockup__status">
                                    <span className="lp-mockup__dot" /> MCP + Postgres Connected
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Logos ─── */}
            <section className="lp-logos">
                <div className="lp-container">
                    <p className="lp-logos__label">Trusted by forward-thinking sustainability teams</p>
                    <div className="lp-logos__row">
                        {['TechFlow', 'GreenLogistics', 'Axial Energy', 'NovaChem', 'EcoShip', 'Vistara Corp'].map(n => (
                            <div key={n} className="lp-logos__pill">{n}</div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Features ─── */}
            <section className="lp-section" id="features">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">Features</span>
                        <h2>Everything you need for carbon compliance</h2>
                        <p>From data ingestion to board-ready reports, CarbonLens covers the full ESG audit lifecycle.</p>
                    </header>
                    <div className="lp-grid lp-grid--3">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="lp-card lp-card--feature">
                                <div className="lp-card__icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── How It Works ─── */}
            <section className="lp-section lp-section--alt" id="how-it-works">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">How It Works</span>
                        <h2>From raw data to audit-ready reports</h2>
                        <p>Three steps to full carbon transparency. No PhD in sustainability required.</p>
                    </header>
                    <div className="lp-steps">
                        {HOW_IT_WORKS.map((s, i) => (
                            <div key={i} className="lp-step">
                                <div className="lp-step__num">{s.step}</div>
                                <div className="lp-step__body">
                                    <h3>{s.title}</h3>
                                    <p>{s.description}</p>
                                </div>
                                {i < HOW_IT_WORKS.length - 1 && <div className="lp-step__line" />}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Scopes ─── */}
            <section className="lp-section" id="scopes">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">GHG Protocol</span>
                        <h2>Full coverage across all three emission scopes</h2>
                        <p>The world's most widely used greenhouse gas accounting framework, built right in.</p>
                    </header>
                    <div className="lp-grid lp-grid--3">
                        {SCOPES.map((s, i) => (
                            <div key={i} className="lp-card lp-card--scope">
                                <div className="lp-card__stripe" style={{ background: s.gradient }} />
                                <div className="lp-card__scopenum" style={{ color: s.color }}>Scope {s.num}</div>
                                <h3>{s.label}</h3>
                                <p>{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Who It's For ─── */}
            <section className="lp-section lp-section--alt" id="who">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">Built For</span>
                        <h2>Every stakeholder in your sustainability journey</h2>
                    </header>
                    <div className="lp-grid lp-grid--2">
                        {WHO_ITS_FOR.map((w, i) => (
                            <div key={i} className="lp-card lp-card--role">
                                <div className="lp-card__rolenum">{i + 1}</div>
                                <div>
                                    <h4>{w.role}</h4>
                                    <p>{w.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Testimonials ─── */}
            <section className="lp-section">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">Testimonials</span>
                        <h2>Loved by sustainability teams</h2>
                    </header>
                    <div className="lp-grid lp-grid--3">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className="lp-card lp-card--testimonial">
                                <div className="lp-card__quote">"</div>
                                <p>{t.quote}</p>
                                <div className="lp-card__author">
                                    <div className="lp-card__avatar">{t.avatar}</div>
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
            <section className="lp-section lp-section--alt" id="pricing">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">Pricing</span>
                        <h2>Simple, transparent pricing</h2>
                        <p>Start free. Scale as your sustainability program grows.</p>
                    </header>
                    <div className="lp-grid lp-grid--3 lp-grid--pricing">
                        {PLANS.map((plan, i) => (
                            <div key={i} className={`lp-plan${plan.highlighted ? ' lp-plan--pop' : ''}`}>
                                {plan.highlighted && <div className="lp-plan__badge">Most Popular</div>}
                                <h3>{plan.name}</h3>
                                <div className="lp-plan__price">
                                    <span className="lp-plan__amount">{plan.price}</span>
                                    {plan.period && <span className="lp-plan__period">{plan.period}</span>}
                                </div>
                                <p className="lp-plan__desc">{plan.description}</p>
                                <ul className="lp-plan__list">
                                    {plan.features.map((f, j) => (
                                        <li key={j}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className={`lp-btn lp-btn--block${plan.highlighted ? ' lp-btn--primary' : ' lp-btn--ghost'}`}>
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Tech ─── */}
            <section className="lp-section">
                <div className="lp-container">
                    <header className="lp-section__head">
                        <span className="lp-tag">Technology</span>
                        <h2>Modern, production-grade stack</h2>
                        <p>Every AI feature has a deterministic fallback. No API key? No internet? CarbonLens keeps working.</p>
                    </header>
                    <div className="lp-tech">
                        {TECH_STACK.map((t, i) => (
                            <div key={i} className="lp-tech__chip">
                                <span className="lp-tech__name">{t.name}</span>
                                <span className="lp-tech__cat">{t.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="lp-cta">
                <div className="lp-container lp-cta__inner">
                    <h2>Ready to decarbonize with confidence?</h2>
                    <p>Join hundreds of sustainability teams using CarbonLens to track, report, and reduce emissions.</p>
                    <div className="lp-hero__actions">
                        <Link to="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                            Start Free Trial
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </Link>
                        <Link to="/login" className="lp-btn lp-btn--ghost lp-btn--lg">Sign In</Link>
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="lp-footer">
                <div className="lp-container lp-footer__inner">
                    <div className="lp-footer__brand">
                        <div className="lp-brand"><img src="/logo.png" alt="" /><span>CarbonLens</span></div>
                        <p>AI-powered carbon audit intelligence for modern sustainability teams.</p>
                    </div>
                    <div className="lp-footer__cols">
                        <div><h4>Product</h4><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#how-it-works">How It Works</a></div>
                        <div><h4>Compliance</h4><span>CSRD</span><span>SEC Climate</span><span>GHG Protocol</span></div>
                        <div><h4>Account</h4><Link to="/login">Sign In</Link><Link to="/signup">Register</Link></div>
                    </div>
                </div>
                <div className="lp-container lp-footer__bottom">
                    <span>&copy; {new Date().getFullYear()} CarbonLens. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}

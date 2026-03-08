import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

const currentYear = new Date().getFullYear();

export default function CarbonBudget() {
    const toast = useToast();
    const [budgets, setBudgets] = useState([]);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [budgetData, setBudgetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newBudget, setNewBudget] = useState({ year: currentYear, annual_budget: '', notes: '' });
    const [showForm, setShowForm] = useState(false);

    const loadBudgets = useCallback(async () => {
        try {
            const json = await api.get('/budgets');
            setBudgets(json.data || []);
        } catch (err) {
            console.warn('Failed to load budgets:', err.message);
        }
    }, []);

    const loadBudgetDetail = useCallback(async (year) => {
        setLoading(true);
        try {
            const json = await api.get(`/budgets/${year}`);
            setBudgetData(json.data);
        } catch {
            setBudgetData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadBudgets(); }, [loadBudgets]);
    useEffect(() => { loadBudgetDetail(selectedYear); }, [selectedYear, loadBudgetDetail]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newBudget.annual_budget) return;
        setSaving(true);
        try {
            await api.post('/budgets', newBudget);
            toast.success('Budget saved');
            setShowForm(false);
            setSelectedYear(newBudget.year);
            await loadBudgets();
            await loadBudgetDetail(newBudget.year);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const statusColor = {
        on_track: 'var(--accent-emerald)',
        at_risk: 'var(--accent-amber)',
        over_budget: 'var(--accent-rose)',
    };

    const statusLabel = {
        on_track: 'On Track',
        at_risk: 'At Risk',
        over_budget: 'Over Budget',
    };

    const fmt = (v) => Math.round(v).toLocaleString();
    const pct = (v) => v.toFixed(1);

    return (
        <>
            <div className="page-header">
                <h2>Carbon Budget Autopilot</h2>
                <p>Set annual carbon budgets, track monthly burn rate, and get projected year-end forecasts</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {budgets.map(b => (
                    <button key={b.year} className={`btn ${b.year === selectedYear ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSelectedYear(b.year)}>
                        {b.year}
                    </button>
                ))}
                <button className="btn btn-secondary" onClick={() => { setShowForm(!showForm); setNewBudget({ year: currentYear, annual_budget: '', notes: '' }); }}>
                    + Set Budget
                </button>
            </div>

            {showForm && (
                <div className="card animate-in" style={{ marginBottom: '24px' }}>
                    <div className="card-header"><span className="card-title">Set Carbon Budget</span></div>
                    <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', padding: '4px 0' }}>
                        <div className="form-group">
                            <label className="form-label">Year</label>
                            <input className="form-input" type="number" min="2020" max="2035" value={newBudget.year}
                                onChange={e => setNewBudget({ ...newBudget, year: parseInt(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Annual Budget (kg CO2e)</label>
                            <input className="form-input" type="number" min="0" step="100" placeholder="e.g. 500000"
                                value={newBudget.annual_budget} onChange={e => setNewBudget({ ...newBudget, annual_budget: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input className="form-input" type="text" placeholder="e.g. SBTi aligned" value={newBudget.notes}
                                onChange={e => setNewBudget({ ...newBudget, notes: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button className="btn btn-primary" type="submit" disabled={saving} style={{ width: '100%' }}>
                                {saving ? 'Saving...' : 'Save Budget'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="card animate-in" style={{ textAlign: 'center', padding: '60px' }}>
                    <span className="loading-spinner" style={{ width: 32, height: 32, borderWidth: 3 }}></span>
                    <p style={{ color: 'var(--text-muted)', marginTop: '16px' }}>Loading budget data...</p>
                </div>
            ) : !budgetData ? (
                <div className="card animate-in" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
                    <h3 style={{ color: 'var(--text-secondary)' }}>No budget set for {selectedYear}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click "Set Budget" to create one</p>
                </div>
            ) : (
                <>
                    {/* Status Banner */}
                    <div className="card animate-in" style={{ marginBottom: '24px', borderLeft: `4px solid ${statusColor[budgetData.status]}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: statusColor[budgetData.status] }}></span>
                                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: statusColor[budgetData.status] }}>
                                        {statusLabel[budgetData.status]}
                                    </span>
                                </div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    {budgetData.monthsElapsed} months elapsed, {budgetData.monthsRemaining} remaining
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {fmt(budgetData.totalBurned)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ {fmt(budgetData.budget.annual_budget)} kg CO2e</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {pct(budgetData.percentUsed)}% used
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="kpi-grid" style={{ marginBottom: '24px' }}>
                        <div className="kpi-card">
                            <div className="kpi-label">Budget</div>
                            <div className="kpi-value">{fmt(budgetData.budget.annual_budget)}</div>
                            <div className="kpi-sub">kg CO2e / year</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Burned YTD</div>
                            <div className="kpi-value" style={{ color: budgetData.status === 'over_budget' ? 'var(--accent-rose)' : 'inherit' }}>
                                {fmt(budgetData.totalBurned)}
                            </div>
                            <div className="kpi-sub">{pct(budgetData.percentUsed)}% of budget</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Remaining</div>
                            <div className="kpi-value" style={{ color: budgetData.remaining < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                                {budgetData.remaining < 0 ? '-' : ''}{fmt(Math.abs(budgetData.remaining))}
                            </div>
                            <div className="kpi-sub">kg CO2e left</div>
                        </div>
                        <div className="kpi-card">
                            <div className="kpi-label">Projected Year-End</div>
                            <div className="kpi-value" style={{ color: budgetData.projectedYearEnd > budgetData.budget.annual_budget ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                                {fmt(budgetData.projectedYearEnd)}
                            </div>
                            <div className="kpi-sub">at current rate</div>
                        </div>
                    </div>

                    {/* Monthly Burn Chart */}
                    <div className="charts-grid">
                        <div className="card animate-in">
                            <div className="card-header">
                                <span className="card-title">Monthly Burn Rate</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    Avg: {fmt(budgetData.avgMonthlyBurn)} kg/month
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {budgetData.monthlyBurn.map(m => {
                                    const maxBurn = Math.max(...budgetData.monthlyBurn.map(x => x.burn), 1);
                                    const widthPct = (m.burn / maxBurn) * 100;
                                    const monthAllowance = budgetData.budget.annual_budget / 12;
                                    const overBudget = m.burn > monthAllowance;
                                    return (
                                        <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ width: '60px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                                                {m.month.slice(5)}
                                            </span>
                                            <div style={{ flex: 1, height: '24px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{
                                                    height: '100%', width: `${widthPct}%`, borderRadius: '4px',
                                                    background: overBudget ? 'var(--accent-rose)' : 'var(--gradient-primary)',
                                                    transition: 'width 0.5s ease',
                                                }}></div>
                                            </div>
                                            <span style={{ width: '80px', fontSize: '0.75rem', color: overBudget ? 'var(--accent-rose)' : 'var(--text-secondary)', textAlign: 'right', flexShrink: 0, fontWeight: overBudget ? 600 : 400 }}>
                                                {fmt(m.burn)} kg
                                            </span>
                                        </div>
                                    );
                                })}
                                {budgetData.monthlyBurn.length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px', fontSize: '0.85rem' }}>No emission data recorded yet for {selectedYear}</p>
                                )}
                            </div>
                        </div>

                        <div className="card animate-in">
                            <div className="card-header">
                                <span className="card-title">Budget Forecast</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Budget gauge */}
                                <div style={{ position: 'relative', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: '280px' }}>
                                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--bg-tertiary)" strokeWidth="14" strokeLinecap="round" />
                                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
                                            stroke={statusColor[budgetData.status]}
                                            strokeWidth="14" strokeLinecap="round"
                                            strokeDasharray={`${Math.min(budgetData.percentUsed, 100) * 2.51} 251`}
                                        />
                                        <text x="100" y="85" textAnchor="middle" style={{ fontSize: '28px', fontWeight: 700, fill: 'var(--text-primary)' }}>
                                            {pct(Math.min(budgetData.percentUsed, 100))}%
                                        </text>
                                        <text x="100" y="105" textAnchor="middle" style={{ fontSize: '10px', fill: 'var(--text-muted)' }}>
                                            budget used
                                        </text>
                                    </svg>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Monthly Allowance</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fmt(budgetData.monthlyAllowance)} kg</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Monthly Burn</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: budgetData.avgMonthlyBurn > budgetData.budget.annual_budget / 12 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                                            {fmt(budgetData.avgMonthlyBurn)} kg
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Year-End Projection</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: budgetData.projectedYearEnd > budgetData.budget.annual_budget ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                                            {fmt(budgetData.projectedYearEnd)} kg
                                        </span>
                                    </div>
                                </div>

                                {budgetData.budget.notes && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                                        {budgetData.budget.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

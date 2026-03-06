import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

const PARTICLE_COUNT = 40;

function BackgroundCanvas() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            opacity: Math.random() * 0.4 + 0.1,
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
                ctx.fill();
            }

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(59, 130, 246, ${0.06 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="login-canvas" />;
}

export default function Login({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const body = isRegister ? form : { email: form.email, password: form.password };
            const json = await api.post(endpoint, body);
            localStorage.setItem('token', json.data.token);
            localStorage.setItem('user', JSON.stringify(json.data.user));
            onLogin(json.data.user);
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        const guest = { id: 'guest', name: 'Guest User', email: '', role: 'admin' };
        localStorage.setItem('user', JSON.stringify(guest));
        onLogin(guest);
    };

    return (
        <div className="login-page">
            <BackgroundCanvas />

            {/* Decorative gradient orbs */}
            <div className="login-orb login-orb-1" />
            <div className="login-orb login-orb-2" />
            <div className="login-orb login-orb-3" />

            <div className="login-container">
                {/* Left panel: branding */}
                <div className="login-branding">
                    <div className="login-branding-inner">
                        <div className="login-logo-ring">
                            <img src="/logo.png" alt="CarbonLens" className="login-logo-img" />
                        </div>
                        <h1 className="login-brand-name">CarbonLens</h1>
                        <p className="login-brand-tagline">ESG Carbon Audit Intelligence</p>

                        <div className="login-features">
                            <div className="login-feature">
                                <div className="login-feature-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                </div>
                                <span>Real-time emission tracking</span>
                            </div>
                            <div className="login-feature">
                                <div className="login-feature-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                                </div>
                                <span>SBTi-aligned reduction targets</span>
                            </div>
                            <div className="login-feature">
                                <div className="login-feature-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                </div>
                                <span>AI-powered carbon insights</span>
                            </div>
                            <div className="login-feature">
                                <div className="login-feature-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                </div>
                                <span>CSRD & SEC disclosure reports</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right panel: auth form */}
                <div className="login-form-panel">
                    <div className="login-form-inner">
                        <div className="login-form-header">
                            <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
                            <p>{isRegister ? 'Start your decarbonization journey' : 'Sign in to your carbon dashboard'}</p>
                        </div>

                        {error && (
                            <div className="login-error">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="login-form">
                            {isRegister && (
                                <div className={`login-field ${focusedField === 'name' ? 'focused' : ''}`}>
                                    <label>Full Name</label>
                                    <div className="login-input-wrap">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            onFocus={() => setFocusedField('name')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Jane Smith"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className={`login-field ${focusedField === 'email' ? 'focused' : ''}`}>
                                <label>Email Address</label>
                                <div className="login-input-wrap">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="you@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={`login-field ${focusedField === 'password' ? 'focused' : ''}`}>
                                <label>Password</label>
                                <div className="login-input-wrap">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="Min. 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <button className="login-submit" type="submit" disabled={loading}>
                                {loading ? (
                                    <span className="loading-spinner-sm" />
                                ) : (
                                    <>
                                        {isRegister ? 'Create Account' : 'Sign In'}
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-switch">
                            <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
                            <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                                {isRegister ? 'Sign In' : 'Register'}
                            </button>
                        </div>

                        <div className="login-divider">
                            <span>or</span>
                        </div>

                        <button className="login-guest" onClick={handleSkip}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                            Continue as Guest
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

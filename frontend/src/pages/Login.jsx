import React, { useState } from 'react';

export default function Login({ onLogin, onNavigate }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const payload = isLogin ? { email, password } : { name, email, password };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                // Save token to localStorage
                localStorage.setItem('carbonlens_token', json.token);
                localStorage.setItem('carbonlens_user', JSON.stringify(json.user));
                onLogin(json.user);
            } else {
                setError(json.error || 'Authentication failed');
            }
        } catch (err) {
            setError('Network error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'var(--bg-primary)', padding: '20px'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
                <img src="/logo.png" alt="CarbonLens" style={{ width: '64px', height: '64px', marginBottom: '16px' }} />
                <h2 style={{ marginBottom: '8px' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
                    {isLogin ? 'Sign in to access your ESG dashboard' : 'Join CarbonLens to track your footprint'}
                </p>

                {error && <div className="alert-item critical" style={{ marginBottom: '20px', padding: '12px', fontSize: '0.85rem' }}>
                    {error}
                </div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Work Email</label>
                        <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <p style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button className="btn-ghost" style={{ cursor: 'pointer', border: 'none', color: 'var(--accent-blue)', fontWeight: '600' }}
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}>
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}

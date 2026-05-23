// apps/inventory/src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' ? 'Invalid email or password' : 'Login failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&h=900&fit=crop" alt="" className="login-bg-img"/>
        <div className="login-bg-overlay"/>
      </div>
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">BB</div>
          <div>
            <p className="login-brand-name">BlueBliss</p>
            <p className="login-brand-tag">Inventory Intelligence</p>
          </div>
        </div>
        <h2 className="login-title">Sign in</h2>
        <p className="login-sub">Access your inventory dashboard</p>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label>Email address</label>
            <input className="login-input" type="email" placeholder="you@bluebliss.in"
              value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
          </div>
          <div className="login-field">
            <label>Password</label>
            <input className="login-input" type="password" placeholder="••••••••"
              value={password} onChange={e=>setPassword(e.target.value)}/>
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>
        <p className="login-footer">BlueBliss Foods & Technologies · v1.0</p>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import store from '../engine/store';

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser, showToast } = useApp();
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const id = loginId.trim().toUpperCase();
    const user = store.findUser(id);
    if (user) {
      store.setUser(user);
      refreshUser();
      showToast(`Welcome back, ${user.name}!`);
      setTimeout(() => navigate('/shop'), 300);
    } else {
      setError(`No user found with ID "${id}". Try DEMO01, DEMO02, or DEMO03.`);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-sub">Enter your unique ID to continue shopping</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Unique ID</label>
            <input type="text" className="form-input" value={loginId} onChange={e => setLoginId(e.target.value)}
              placeholder="e.g. DEMO01" maxLength={6} required style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: '1.2rem', textAlign: 'center' }} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Login</button>
        </form>
        {error && <p style={{ color: 'var(--danger)', fontSize: '.85rem', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.9rem', color: 'var(--text2)' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg2)', borderRadius: 'var(--r-sm)', fontSize: '.8rem', color: 'var(--muted)' }}>
          <strong>Demo accounts:</strong> DEMO01 (Alice), DEMO02 (Bob), DEMO03 (Carol)
        </div>
      </div>
    </div>
  );
}

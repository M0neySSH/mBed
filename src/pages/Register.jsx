import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import store from '../engine/store';

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser, showToast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [done, setDone] = useState(null);

  const handle = (e) => {
    e.preventDefault();
    const unique_id = store.generateUniqueId();
    const user = { unique_id, ...form };
    store.addUser(user);
    store.setUser(user);
    refreshUser();
    showToast('Account created!');
    setDone(unique_id);
  };

  return (
    <div className="auth-container">
      <div className="glass auth-card">
        <h2>Create Account</h2>
        <p className="auth-sub">Register to get personalized AI recommendations</p>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>✅</div>
            <h3>Registration Successful!</h3>
            <p style={{ margin: '.5rem 0', color: 'var(--text2)' }}>Your Unique ID:</p>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: 4, color: 'var(--accent)', margin: '.5rem 0' }}>{done}</div>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Save this ID — you'll need it to login</p>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>Start Shopping →</Link>
          </div>
        ) : (
          <form onSubmit={handle}>
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Phone (10 digits)</label><input type="tel" className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} pattern="[0-9]{10}" required /></div>
            <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required /></div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Register</button>
          </form>
        )}
        {!done && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.9rem', color: 'var(--text2)' }}>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        )}
      </div>
    </div>
  );
}

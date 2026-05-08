import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import store from '../engine/store';

export default function Navbar() {
  const { user, cartCount, refreshUser } = useApp();
  const location = useLocation();
  const active = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    store.logout();
    refreshUser();
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        DemoKART
      </Link>
      <ul className="nav-links" id="nav-links">
        <li><Link to="/" className={active('/')}>Home</Link></li>
        <li><Link to="/shop" className={active('/shop')}>Shop</Link></li>
        <li><Link to="/recommendations" className={active('/recommendations')}>AI Picks</Link></li>
        <li><Link to="/admin" className={active('/admin')}>Admin</Link></li>
        <li><Link to="/sales" className={active('/sales')}>Sales</Link></li>
      </ul>
      <div className="nav-right">
        {user && <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>}
        <Link to="/cart" className="cart-badge" title="Cart" style={{ textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </Link>
        {user ? (
          <Link to="/login" onClick={handleLogout} className="btn btn-sm btn-secondary">Logout</Link>
        ) : (
          <Link to="/login" className="btn btn-sm btn-primary">Login</Link>
        )}
      </div>
      <button className="hamburger" onClick={() => document.getElementById('nav-links').classList.toggle('open')}>☰</button>
    </nav>
  );
}

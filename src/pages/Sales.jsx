import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ProductCard';
import store from '../engine/store';

export default function Sales() {
  const purchases = store.getAllPurchases();

  if (purchases.length === 0) {
    return (
      <>
        <div className="page-header"><h1>Sales History</h1><p>Track all transactions and revenue</p></div>
        <div className="section"><EmptyState icon="📊" title="No Sales Yet" message="Sales will appear here after purchases are made."><Link to="/shop" className="btn btn-primary">Go Shopping</Link></EmptyState></div>
      </>
    );
  }

  const totalRevenue = purchases.reduce((s, p) => s + p.total, 0);
  const totalItems = purchases.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.qty, 0), 0);
  const uniqueBuyers = new Set(purchases.map(p => p.userId)).size;

  return (
    <>
      <div className="page-header"><h1>Sales History</h1><p>Track all transactions and revenue</p></div>
      <div className="section">
        <div className="stats-grid">
          <div className="glass stat-card"><div className="stat-value">${totalRevenue.toFixed(2)}</div><div className="stat-label">Total Revenue</div></div>
          <div className="glass stat-card"><div className="stat-value">{purchases.length}</div><div className="stat-label">Total Orders</div></div>
          <div className="glass stat-card"><div className="stat-value">{totalItems}</div><div className="stat-label">Items Sold</div></div>
          <div className="glass stat-card"><div className="stat-value">{uniqueBuyers}</div><div className="stat-label">Unique Buyers</div></div>
        </div>
        <div className="glass" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Receipt</th><th>Buyer</th><th>Date</th><th>Items</th><th>Total</th></tr></thead>
            <tbody>
              {[...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--ink)', fontWeight: 600 }}>{p.id}</td>
                  <td>{p.userName} ({p.userId})</td>
                  <td style={{ color: 'var(--muted)' }}>{new Date(p.date).toLocaleDateString()}</td>
                  <td>{p.items.map(i => i.name).join(', ')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--ink)' }}>${p.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function Checkout() {
  const receipt = JSON.parse(sessionStorage.getItem('last_receipt') || 'null');

  if (!receipt) {
    return <div className="section" style={{ maxWidth: 600, margin: '0 auto' }}><div className="empty-state"><div className="empty-icon">📦</div><h3>No Recent Order</h3><p style={{ color: 'var(--muted)' }}>Make a purchase to see your receipt.</p><Link to="/shop" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Shopping</Link></div></div>;
  }

  const date = new Date(receipt.date);
  return (
    <div className="section" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="glass" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>✅</div>
          <h2 style={{ color: 'var(--ink)' }}>Order Confirmed!</h2>
          <p style={{ color: 'var(--muted)' }}>Thank you for shopping with DemoKART</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '.85rem', color: 'var(--muted)' }}>
          <span>Receipt #{receipt.id}</span><span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
        </div>
        <div style={{ borderTop: '1px solid var(--hairline-soft)', borderBottom: '1px solid var(--hairline-soft)', padding: '1rem 0', marginBottom: '1rem' }}>
          {receipt.items.map((i, idx) => (
            <div key={idx} className="receipt-line"><span>{i.name} × {i.qty}</span><span style={{ color: 'var(--ink)' }}>${i.lineTotal.toFixed(2)}</span></div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          <span>Total</span><span style={{ color: 'var(--ink)' }}>${receipt.total.toFixed(2)}</span>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem', background: 'white', borderRadius: 'var(--r-md)', display: 'inline-block', width: '100%' }}>
          <p style={{ color: '#333', fontSize: '.85rem', marginBottom: '1rem', fontWeight: 600 }}>Scan to save receipt</p>
          <div style={{ background: 'white', padding: '10px', display: 'inline-block', borderRadius: '8px' }}>
            <QRCodeSVG 
              value={`DemoKART Receipt\nUser: ${receipt.userName} (${receipt.userId})\nDate: ${date.toLocaleString()}\n${receipt.items.map(i => `${i.name} x${i.qty} = $${i.lineTotal.toFixed(2)}`).join('\n')}\nGrand Total: $${receipt.total.toFixed(2)}`} 
              size={180} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.8rem', flexDirection: 'column' }}>
          <Link to="/recommendations" className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>See New AI Recommendations</Link>
          <Link to="/shop" className="btn btn-secondary btn-lg" style={{ justifyContent: 'center' }}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

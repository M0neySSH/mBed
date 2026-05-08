import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { EmptyState } from '../components/ProductCard';
import store from '../engine/store';

export default function Cart() {
  const { products, user, refreshCart, addToCart, showToast } = useApp();
  const cart = store.getCart();
  const localProducts = store.getProducts() || products;

  const handleQty = (id, qty) => { store.updateCartQty(id, qty); refreshCart(); };
  const handleRemove = (id) => { store.removeFromCart(id); refreshCart(); };

  const handleCheckout = () => {
    if (!user) return;
    const items = [];
    let total = 0;
    cart.forEach(c => {
      const p = localProducts.find(p => p.id === c.productId);
      if (p) {
        const lt = p.price * c.qty;
        items.push({ productId: p.id, name: p.name, price: p.price, qty: c.qty, lineTotal: lt });
        total += lt;
        store.updateProductStock(p.id, c.qty);
      }
    });
    const purchase = { id: 'R' + Date.now().toString(36).toUpperCase(), userId: user.unique_id, userName: user.name, date: new Date().toISOString(), items, total: Math.round(total * 100) / 100 };
    store.addPurchase(purchase);
    store.clearCart();
    refreshCart();
    sessionStorage.setItem('last_receipt', JSON.stringify(purchase));
    window.location.href = '/checkout';
  };

  if (cart.length === 0) {
    return <div className="cart-container"><EmptyState icon="🛒" title="Your Cart is Empty" message="Add some products to get started!"><Link to="/shop" className="btn btn-primary">Browse Shop</Link></EmptyState></div>;
  }

  let total = 0;
  return (
    <div className="cart-container">
      <div style={{ marginBottom: 'var(--sp-xl)' }}><h1>Your Cart</h1><p style={{ color: 'var(--muted)' }}>{cart.length} item{cart.length > 1 ? 's' : ''}</p></div>
      {cart.map(c => {
        const p = localProducts.find(p => p.id === c.productId) || products.find(p => p.id === c.productId);
        if (!p) return null;
        const lt = p.price * c.qty;
        total += lt;
        return (
          <div key={c.productId} className="glass cart-item">
            <div className="cart-item-emoji">{p.emoji.startsWith('http') ? <img src={p.emoji} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r-sm)' }} /> : p.emoji}</div>
            <div className="cart-item-info">
              <div className="cart-item-name">{p.name}</div>
              <div className="product-category">{p.category}</div>
              <div className="cart-item-price">${p.price.toFixed(2)} each</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)' }}>
              <button className="qty-btn" onClick={() => handleQty(p.id, c.qty - 1)}>−</button>
              <span style={{ minWidth: 30, textAlign: 'center', fontWeight: 600 }}>{c.qty}</span>
              <button className="qty-btn" onClick={() => handleQty(p.id, c.qty + 1)}>+</button>
            </div>
            <div style={{ minWidth: 80, textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>${lt.toFixed(2)}</div>
              <button className="btn btn-danger btn-sm" style={{ marginTop: 'var(--sp-xs)' }} onClick={() => handleRemove(p.id)}>Remove</button>
            </div>
          </div>
        );
      })}
      <div className="glass" style={{ padding: '2rem', marginTop: '1rem' }}>
        <div className="cart-total"><span>Total</span><span className="amount">${total.toFixed(2)}</span></div>
        {user ? (
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleCheckout}>💳 Checkout — ${total.toFixed(2)}</button>
        ) : (
          <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Login to Checkout</Link>
        )}
        <Link to="/shop" className="btn btn-secondary btn-lg" style={{ width: '100%', marginTop: '.8rem', justifyContent: 'center' }}>Continue Shopping</Link>
      </div>
    </div>
  );
}

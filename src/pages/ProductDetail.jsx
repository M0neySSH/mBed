import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../App';
import { SimilarityBar, StarRating } from '../components/ProductCard';
import store from '../engine/store';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, engine, user, addToCart, showToast } = useApp();
  const product = products.find(p => p.id === parseInt(id));

  const [userRating, setUserRating] = useState(() => user ? store.getUserRating(user.unique_id, parseInt(id)) : 0);
  const similar = useMemo(() => engine?.getSimilarItems(parseInt(id), 4) || [], [engine, id]);
  const complementary = useMemo(() => engine?.getFrequentlyBoughtTogether(parseInt(id), store.getAllPurchases()) || [], [engine, id]);
  const avgRating = store.getItemAvgRating(parseInt(id));

  if (!product) {
    return <div className="section"><div className="empty-state"><div className="empty-icon">🔍</div><h3>Product Not Found</h3><Link to="/shop" className="btn btn-primary">Back to Shop</Link></div></div>;
  }

  const handleRate = (r) => {
    if (!user) { showToast('Login to rate', 'error'); return; }
    store.rateItem(user.unique_id, product.id, r);
    setUserRating(r);
    showToast(`Rated ${r} stars!`);
  };

  return (
    <div className="section" style={{ maxWidth: 1000 }}>
      <Link to="/shop" style={{ color: 'var(--muted)', fontSize: '14px' }}>← Back to Shop</Link>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-xl)', marginTop: 'var(--sp-base)' }} className="product-detail-grid">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, fontSize: '6rem', borderRadius: 'var(--r-md)', background: 'var(--surface-soft)', border: '1px solid var(--hairline-soft)' }}>
          {product.emoji.startsWith('http') ? <img src={product.emoji} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r-md)' }} /> : product.emoji}
        </div>
        <div>
          <span className="tag" style={{ marginBottom: 'var(--sp-sm)', display: 'inline-block' }}>{product.category}</span>
          <h1 style={{ fontSize: '32px', marginBottom: 'var(--sp-sm)', fontWeight: 600 }}>{product.name}</h1>
          <p style={{ color: 'var(--body)', marginBottom: 'var(--sp-base)' }}>{product.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-base)', marginBottom: 'var(--sp-base)' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ink)' }}>${product.price.toFixed(2)}</span>
            <span className="tag">{product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}</span>
          </div>
          {avgRating > 0 && <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: 'var(--sp-xs)' }}>Average: {avgRating.toFixed(1)}/5</p>}
          <div style={{ marginBottom: 'var(--sp-lg)' }}>
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Your Rating: </span>
            <StarRating rating={userRating} interactive onRate={handleRate} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-base)' }}>
            <button className="btn btn-primary btn-lg" onClick={() => addToCart(product.id)} disabled={product.quantity <= 0}>Add to Cart</button>
            <Link to="/cart" className="btn btn-secondary btn-lg">View Cart</Link>
          </div>
          <div style={{ marginTop: 'var(--sp-lg)', padding: 'var(--sp-base)', background: 'var(--surface-soft)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 'var(--sp-xs)' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-xs)' }}>
              {(product.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* LAYER 4: ASSOCIATION RULES — Frequently Bought Together */}
      {complementary.length > 0 && (
        <div style={{ marginTop: 'var(--sp-section)' }}>
          <h3 style={{ marginBottom: 'var(--sp-xs)' }}>Frequently Bought Together</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: 'var(--sp-base)' }}>
            Association Rules (Market Basket Analysis) — Complementary items that customers buy together
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-base)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="glass" style={{ padding: 'var(--sp-base)', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: '2.5rem' }}>{product.emoji.startsWith('http') ? <img src={product.emoji} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} /> : product.emoji}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginTop: 'var(--sp-xs)' }}>{product.name}</div>
              <div style={{ color: 'var(--ink)', fontWeight: 700 }}>${product.price.toFixed(2)}</div>
            </div>
            {complementary.map(c => (
              <div key={c.product.id} style={{ display: 'contents' }}>
                <span style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>+</span>
                <div className="glass glass-lift" style={{ padding: 'var(--sp-base)', textAlign: 'center', minWidth: 120, cursor: 'pointer' }}
                  onClick={() => navigate(`/product/${c.product.id}`)}>
                  <div style={{ fontSize: '2.5rem' }}>{c.product.emoji.startsWith('http') ? <img src={c.product.emoji} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} /> : c.product.emoji}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginTop: 'var(--sp-xs)' }}>{c.product.name}</div>
                  <div style={{ color: 'var(--ink)', fontWeight: 700 }}>${c.product.price.toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 'var(--sp-xs)' }}>{c.reason}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Confidence: {Math.round(c.confidence * 100)}%</div>
                </div>
              </div>
            ))}
            <span style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>=</span>
            <div className="glass" style={{ padding: 'var(--sp-base)', textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)' }}>
                ${(product.price + complementary.reduce((s, c) => s + c.product.price, 0)).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Bundle Total</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--sp-sm)' }}
                onClick={() => { addToCart(product.id); complementary.forEach(c => addToCart(c.product.id)); }}>
                Add All to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAYER 1: CONTENT-BASED — Similar Products */}
      {similar.length > 0 && (
        <div style={{ marginTop: 'var(--sp-section)' }}>
          <h3 style={{ marginBottom: 'var(--sp-xs)' }}>Similar Products (AI-Powered)</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: 'var(--sp-base)' }}>Found using cosine similarity between all-MiniLM-L6-v2 embedding vectors</p>
          <div className="rec-grid">
            {similar.map(s => (
              <div key={s.product.id} className="rec-card" onClick={() => navigate(`/product/${s.product.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-sm)' }}>
                  <span style={{ fontSize: '2rem' }}>{s.product.emoji.startsWith('http') ? <img src={s.product.emoji} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} /> : s.product.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.product.name}</div>
                    <div style={{ color: 'var(--ink)', fontWeight: 600 }}>${s.product.price.toFixed(2)}</div>
                  </div>
                </div>
                <SimilarityBar label="Similarity" percent={s.matchPercent} />
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@media(max-width:768px){.product-detail-grid{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import store from '../engine/store';

function getCatClass(category) {
  const c = category.toLowerCase().replace(/[^a-z]/g, '').replace('beverages', 'food');
  return 'cat-' + c;
}

export function SimilarityBar({ label = 'AI Match', percent }) {
  return (
    <div className="sim-wrap">
      <div className="sim-label"><span>{label}</span><span>{percent}%</span></div>
      <div className="sim-bar"><div className="sim-fill" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export function StarRating({ rating, interactive = false, onRate }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`star ${i <= Math.round(rating) ? 'active' : ''}`}
          onClick={interactive ? () => onRate?.(i) : undefined}>
          {i <= Math.round(rating) ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

export function ProductCard({ product, similarity = null }) {
  const navigate = useNavigate();
  const avgRating = store.getItemAvgRating(product.id);

  return (
    <div className="product-card fade-in" onClick={() => navigate(`/product/${product.id}`)}>
      <div className="product-card-img-wrap">
        {product.emoji.startsWith('http') ? (
          <img src={product.emoji} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="product-card-img">{product.emoji}</span>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 'var(--r-full)', fontSize: '12px' }}>🤍</div>
      </div>
      <div className="product-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="product-name">{product.name}</h3>
          {avgRating > 0 && <div style={{ fontSize: '14px', fontWeight: '500' }}>★ {avgRating.toFixed(2)}</div>}
        </div>
        <span className="product-category">{product.category}</span>
        <span className="product-stock">{product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}</span>
        {similarity !== null && <SimilarityBar percent={similarity} />}
        <div className="product-footer">
          <span className="product-price">${product.price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export function RecCard({ rec, onClick }) {
  return (
    <div className="rec-card" onClick={onClick}>
      <div style={{ fontSize: '2rem', marginBottom: '.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {rec.product.emoji.startsWith('http') ? <img src={rec.product.emoji} alt={rec.product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px' }} /> : rec.product.emoji}
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{rec.product.name}</div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>{rec.reasons?.[0] || rec.reason || 'Recommended'}</div>
      <SimilarityBar label="Match" percent={rec.matchPercent} />
    </div>
  );
}

export function EmptyState({ icon, title, message, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>{message}</p>
      {children}
    </div>
  );
}

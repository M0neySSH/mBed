import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { SimilarityBar, EmptyState } from '../components/ProductCard';
import store from '../engine/store';

export default function Recommendations() {
  const { products, engine, user, loading, addToCart } = useApp();
  const navigate = useNavigate();
  const info = engine?.getInfo();

  const { recs, purchasedIds } = useMemo(() => {
    if (!engine || !user) return { recs: [], purchasedIds: [] };
    const pIds = store.getUserPurchasedItemIds(user.unique_id);
    return { recs: engine.getHybridRecommendations(pIds, store.getAllPurchases(), 12), purchasedIds: pIds };
  }, [engine, user, products]);

  if (loading) return <div className="section"><p>Loading...</p></div>;

  return (
    <>
      <div className="page-header"><h1>🧠 AI-Powered Recommendations</h1><p>Personalized product suggestions using neural embedding-based hybrid scoring</p></div>
      <div className="section">
        {info && (
          <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '2rem' }}>🧬</span>
              <div><strong>Engine:</strong> {info.type} | <strong>Model:</strong> {info.model} | <strong>Dimensions:</strong> {info.dimensions}D | <strong>Products:</strong> {info.totalProducts}</div>
            </div>
          </div>
        )}

        {!user ? (
          <EmptyState icon="🔐" title="Login Required" message="Login to see personalized recommendations based on your purchase history.">
            <Link to="/login" className="btn btn-primary">Login Now</Link>
          </EmptyState>
        ) : (
          <>
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '.5rem' }}>👤 {user.name}'s Profile</h3>
              <p style={{ fontSize: '.9rem', color: 'var(--text2)' }}>ID: {user.unique_id} | Items purchased: {purchasedIds.length} | Purchase history: {store.getPurchases(user.unique_id).length} orders</p>
              {purchasedIds.length > 0 ? (
                <div style={{ marginTop: '.8rem', display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                  {purchasedIds.map(id => {
                    const p = products.find(p => p.id === id);
                    return p ? <span key={id} className="tag">{p.emoji} {p.name}</span> : null;
                  })}
                </div>
              ) : <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem' }}>No purchases yet. Buy some items to get recommendations!</p>}
            </div>

            {recs.length > 0 ? (
              <>
                <h2 style={{ marginBottom: '1.5rem' }}>Recommended For You</h2>
                <div className="product-grid">
                  {recs.map(rec => {
                    const explanation = engine.explainRecommendation(rec.product.id, purchasedIds);
                    return (
                      <div key={rec.product.id} className="product-card fade-in" onClick={() => navigate(`/product/${rec.product.id}`)} style={{ cursor: 'pointer' }}>
                        <div className="product-card-img" style={{ height: 120 }}><span style={{ fontSize: '3rem' }}>{rec.product.emoji}</span></div>
                        <div className="product-card-body">
                          <span className="product-category">{rec.product.category}</span>
                          <h3 className="product-name">{rec.product.name}</h3>
                          <p style={{ fontSize: '.8rem', color: 'var(--accent2)', marginBottom: '.5rem' }}>{explanation.reason}</p>
                          <SimilarityBar label="AI Match" percent={rec.matchPercent} />
                          <div className="product-footer" style={{ marginTop: '.5rem' }}>
                            <span className="product-price">${rec.product.price.toFixed(2)}</span>
                            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); addToCart(rec.product.id); }}>Add to Cart</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState icon="🛍️" title="No Recommendations Yet" message="Start shopping to build your taste profile!">
                <Link to="/shop" className="btn btn-primary">Browse Shop</Link>
              </EmptyState>
            )}
          </>
        )}
      </div>
    </>
  );
}

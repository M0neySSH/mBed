import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { ProductCard } from '../components/ProductCard';
import store from '../engine/store';

export default function Home() {
  const { products, engine, loading, addToCart } = useApp();
  const [coldStartMode, setColdStartMode] = useState('hybrid'); // 'hybrid' | 'top' | 'neighbors'

  // Reads collective sales across ALL buyers in the system (universal for all visitors)
  const allPurchases = useMemo(() => store.getAllPurchases(), []);

  const coldStart = useMemo(() => {
    if (!engine) return null;
    return engine.getColdStartRecommendations(allPurchases, 8);
  }, [engine, allPurchases]);

  const displayItems = useMemo(() => {
    if (!coldStart) return [];
    if (coldStartMode === 'top') return coldStart.topPurchased;
    if (coldStartMode === 'neighbors') return coldStart.embeddingNeighbors;
    return coldStart.hybrid;
  }, [coldStart, coldStartMode]);

  const info = engine?.getInfo();

  if (loading) return <div className="hero"><p>Loading...</p></div>;

  return (
    <>
      <section className="hero">
        <div className="hero-badge">Powered by AI Embeddings</div>
        <h1>Inspiration for smarter shopping</h1>
        <p>DemoKART 2.0 uses neural embeddings and cosine similarity to understand what you love — and recommend products that match your taste perfectly.</p>
        <div className="hero-actions">
          <Link to="/neural-lab" className="btn btn-primary btn-lg">Explore Neural Lab</Link>
          <Link to="/shop" className="btn btn-secondary btn-lg">Browse Shop</Link>
          <Link to="/recommendations" className="btn btn-secondary btn-lg">See AI Picks</Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title" style={{ textAlign: 'center' }}>How Our AI Works</h2>
        <p className="section-sub" style={{ textAlign: 'center' }}>4-layer hybrid recommendation engine using neural embeddings + association rules</p>
        <div className="stats-grid" style={{ maxWidth: 1100, margin: '0 auto' }}>
          {[
            { icon: '📊', title: 'Neural Embeddings', sub: 'Layer 1: Content-Based', desc: 'Converts products into 384-dim vectors using all-MiniLM-L6-v2. Cosine similarity finds similar items.' },
            { icon: '🎯', title: 'User Profiling', sub: 'Layer 2: Collaborative', desc: 'Averages purchase embeddings into a user taste vector. Finds items matching your preferences.' },
            { icon: '📈', title: 'Platform Sales & Cold-Start', sub: 'Layer 3: Global Popularity', desc: 'Aggregates sales across all buyers on the platform to recommend bestsellers and their semantic companions.' },
            { icon: '🔗', title: 'Bought Together', sub: 'Layer 4: Association Rules', desc: 'Market Basket Analysis — finds complementary products (e.g., Coffee → Coffee Maker).' },
          ].map((c, i) => (
            <div key={i} className="glass stat-card fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>{c.icon}</div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{c.title}</div>
              <div className="stat-label">{c.sub}</div>
              <p style={{ fontSize: '.8rem', color: 'var(--text2)', marginTop: '.5rem' }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div style={{ textAlign: 'center', maxWidth: 880, margin: '0 auto var(--sp-xl)' }}>
          <div className="hero-badge" style={{ marginBottom: '0.75rem' }}>
            🌐 Universal Platform Demand · All Buyers Combined
          </div>
          <h2 className="section-title">Top Purchases &amp; Neural Neighbors (Overall Sales)</h2>
          <p className="section-sub" style={{ marginBottom: '1.25rem' }}>
            Aggregated across all shoppers on DemoKART. Highlights the products with the highest overall sales volume and their closest 384-D neural embedding companions — completely consistent for new visitors, guests, and logged-in users alike.
          </p>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'inline-flex', gap: '8px', padding: '4px', background: 'var(--surface-soft)', borderRadius: 'var(--r-full)', border: '1px solid var(--hairline)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className={`lab-pill ${coldStartMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => setColdStartMode('hybrid')}
            >
              ✨ Overall Sales + Neural Neighbors ({coldStart?.hybrid.length || 0})
            </button>
            <button
              className={`lab-pill ${coldStartMode === 'top' ? 'active' : ''}`}
              onClick={() => setColdStartMode('top')}
            >
              🔥 Top Purchased Overall ({coldStart?.topPurchased.length || 0})
            </button>
            <button
              className={`lab-pill ${coldStartMode === 'neighbors' ? 'active' : ''}`}
              onClick={() => setColdStartMode('neighbors')}
            >
              🧬 Neural Embedding Neighbors ({coldStart?.embeddingNeighbors.length || 0})
            </button>
          </div>
        </div>

        {/* Cold-Start Explainer Callout Card */}
        {coldStart && (
          <div className="glass" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--surface-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.75rem' }}>📊</span>
              <div style={{ fontSize: '13px' }}>
                <strong>Platform-Wide Demand Intelligence:</strong> Aggregated <strong>{coldStart.stats.totalUnitsSold} units sold</strong> across <strong>{coldStart.stats.totalOrders} orders</strong> from <strong>{coldStart.stats.uniqueBuyers} unique buyers</strong>. Top bestsellers: <em>{coldStart.stats.topBestsellerNames.slice(0, 3).join(', ')}</em>.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link to="/recommendations" className="btn btn-secondary btn-sm" title="View individual user taste recommendations">
                👤 My Personal Picks →
              </Link>
              <Link to="/neural-lab" className="btn btn-primary btn-sm">
                Inspect 384-D Map →
              </Link>
            </div>
          </div>
        )}

        <div className="product-grid">
          {displayItems.length > 0 ? (
            displayItems.map(item => (
              <ProductCard
                key={item.product.id}
                product={item.product}
                similarity={item.matchPercent}
                badge={item.badge}
                reason={item.reason}
                onAddToCart={addToCart}
              />
            ))
          ) : (
            (products.slice(0, 8)).map(p => (
              <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
            ))
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link to="/shop" className="btn btn-primary btn-lg">Browse Entire Shop →</Link>
        </div>
      </section>

      {info && (
        <section className="section">
          <div className="glass" style={{ padding: '2rem', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>🧠 Embedding Engine Status</h3>
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              <div><div className="stat-value" style={{ fontSize: '1.5rem' }}>{info.dimensions}D</div><div className="stat-label">Vector Dimensions</div></div>
              <div><div className="stat-value" style={{ fontSize: '1.5rem' }}>{info.totalProducts}</div><div className="stat-label">Products Indexed</div></div>
              <div><div className="stat-value" style={{ fontSize: '1.5rem' }}>{info.associationRules || 0}</div><div className="stat-label">Association Rules</div></div>
              <div><div className="stat-value" style={{ fontSize: '1.5rem' }}>4</div><div className="stat-label">AI Layers</div></div>
            </div>
            <p style={{ marginTop: '1rem' }}>
              <span className="tag">{info.type}</span>{' '}
              <span className="tag">{info.model}</span>
            </p>
          </div>
        </section>
      )}
    </>
  );
}

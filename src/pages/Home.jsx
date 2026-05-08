import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { ProductCard } from '../components/ProductCard';

export default function Home() {
  const { products, engine, loading } = useApp();
  if (loading) return <div className="hero"><p>Loading...</p></div>;

  const featured = [...products].sort(() => Math.random() - 0.5).slice(0, 8);
  const info = engine?.getInfo();

  return (
    <>
      <section className="hero">
        <div className="hero-badge">Powered by AI Embeddings</div>
        <h1>Inspiration for smarter shopping</h1>
        <p>DemoKART 2.0 uses neural embeddings and cosine similarity to understand what you love — and recommend products that match your taste perfectly.</p>
        <div className="hero-actions">
          <Link to="/shop" className="btn btn-primary btn-lg">Browse Shop</Link>
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
            { icon: '📈', title: 'Trending', sub: 'Layer 3: Popularity', desc: 'Tracks purchase frequency across all users to surface trending and bestselling items.' },
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
        <h2 className="section-title">Featured Products</h2>
        <p className="section-sub">Explore our top picks across all categories</p>
        <div className="product-grid">
          {featured.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/shop" className="btn btn-primary">View All Products →</Link>
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

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { ProductCard, RecCard, SimilarityBar } from '../components/ProductCard';
import store from '../engine/store';

const API_URL = import.meta.env.VITE_API_URL || '';

const QUICK_SEARCH_CHIPS = [
  'breakfast',
  'coffee',
  'workout',
  'coding setup',
  'fresh fragrance',
  'sweet snack',
];

export default function Shop() {
  const { products, engine, user, loading, addToCart } = useApp();
  const navigate = useNavigate();
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('name');
  const [search, setSearch] = useState('');
  const [liveQueryVec, setLiveQueryVec] = useState({ query: '', vector: null });

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

  // Try fetching live all-MiniLM-L6-v2 query vector from FastAPI if backend is online
  useEffect(() => {
    const q = search.trim();
    if (!q || q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/embed-query?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.vector)) {
            setLiveQueryVec({ query: q, vector: data.vector });
          }
        }
      } catch {
        // Offline or backend not running; RecommendationEngine uses local 384-D vector synthesis
      }
    }, 240);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const activeExternalVector = useMemo(() => {
    const q = search.trim();
    return q && liveQueryVec.query === q ? liveQueryVec.vector : null;
  }, [search, liveQueryVec]);

  const searchAnalysis = useMemo(() => {
    const q = search.trim();
    if (!engine || !q) return null;
    return engine.semanticSearchAndRecommend(q, {
      externalVector: activeExternalVector,
      topSemantic: 8,
      topNearest: 6,
    });
  }, [engine, search, activeExternalVector]);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const text = `${p.name} ${p.category} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => store.getItemAvgRating(b.id) - store.getItemAvgRating(a.id));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, cat, sort, search]);

  const groupedFiltered = useMemo(() => {
    const grouped = {};
    filtered.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  }, [filtered]);

  const recs = useMemo(() => {
    if (!engine) return [];
    const userId = user?.unique_id || 'guest';
    const purchasedIds = store.getUserPurchasedItemIds(userId);
    return engine.getHybridRecommendations(purchasedIds, store.getAllPurchases(), 6);
  }, [engine, user]);

  if (loading) return <div className="section"><p>Loading...</p></div>;

  const isSearching = search.trim().length > 0;

  return (
    <>
      <div className="page-header">
        <h1>Shop</h1>
        <p>Browse products — search anything to trigger real-time nearest-vector neural recommendations</p>
      </div>
      <div className="section">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={cat} onChange={e => setCat(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto', minWidth: 160 }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <input
            className="form-input"
            style={{ width: 'auto', flex: 1, minWidth: 240 }}
            placeholder="Search items or intent (e.g. 'bread', 'breakfast', 'workout', 'coding')..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {isSearching && (
            <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>

        {/* Quick semantic query chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Try semantic search:</span>
          {QUICK_SEARCH_CHIPS.map(chip => (
            <button
              key={chip}
              className={`lab-pill ${search.trim().toLowerCase() === chip ? 'active' : ''}`}
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setSearch(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="two-col">
          <div>
            {/* DIRECT KEYWORD MATCHES */}
            {filtered.length > 0 ? (
              <div>
                {Object.keys(groupedFiltered).map(categoryName => (
                  <div key={categoryName} style={{ marginBottom: '3rem' }}>
                    <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--hairline)', paddingBottom: '.5rem', color: 'var(--ink)' }}>
                      {categoryName}
                    </h2>
                    <div className="product-grid">
                      {groupedFiltered[categoryName].map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧠</div>
                <h3 style={{ marginBottom: '0.4rem' }}>0 Exact Keyword Matches for &ldquo;{search.trim()}&rdquo;</h3>
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Traditional search would stop here — check the <strong>Nearest 384-D Vector Matches</strong> below!
                </p>
              </div>
            )}

            {/* NEAREST VECTOR RECOMMENDATIONS BELOW SEARCH RESULTS */}
            {isSearching && searchAnalysis && searchAnalysis.nearestVectorRecs.length > 0 && (
              <div
                className="glass"
                style={{
                  padding: '1.5rem',
                  marginTop: '1.5rem',
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--hairline)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <h2 style={{ fontSize: 20 }}>Nearest Embedding &amp; Vector Matches</h2>
                      <span className="tag" style={{ background: searchAnalysis.source === 'live-minilm' ? '#dcfce7' : 'var(--canvas)', color: searchAnalysis.source === 'live-minilm' ? '#166534' : 'var(--ink)' }}>
                        {searchAnalysis.source === 'live-minilm' ? 'Live MiniLM-v2 Vector' : '384-D Neural Vector Space'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {searchAnalysis.anchorProduct
                        ? `Recommended by cosine proximity in 384-D space to "${searchAnalysis.anchorProduct.name}" and your search query "${searchAnalysis.query}".`
                        : `Recommended by cosine proximity to your search query "${searchAnalysis.query}".`}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/neural-lab?q=${encodeURIComponent(search.trim())}`)}
                  >
                    Simulate in Neural Lab →
                  </button>
                </div>

                <div className="product-grid">
                  {searchAnalysis.nearestVectorRecs.map(rec => (
                    <div
                      key={rec.product.id}
                      className="glass glass-lift"
                      style={{ padding: '1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                      onClick={() => navigate(`/product/${rec.product.id}`)}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: '2.2rem' }}>
                            {rec.product.emoji.startsWith('http')
                              ? <img src={rec.product.emoji} alt={rec.product.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                              : rec.product.emoji}
                          </span>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span className="tag">θ = {rec.angleDeg.toFixed(1)}°</span>
                            {rec.zeroKeywordMatch && (
                              <span className="tag" style={{ background: '#fff1f2', color: '#be123c' }}>
                                AI Semantic Match
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="product-category">{rec.product.category}</span>
                        <h3 className="product-name" style={{ marginBottom: 4 }}>{rec.product.name}</h3>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{rec.reason}</p>
                        <SimilarityBar label="Vector Proximity" percent={rec.matchPercent} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <span className="product-price">${rec.product.price.toFixed(2)}</span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(rec.product.id);
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="glass sidebar" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '.3rem' }}>
                {isSearching ? 'Top Semantic Hits' : 'AI Picks For You'}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1rem' }}>
                {isSearching
                  ? `Ranked purely by 384-D cosine similarity for "${search.trim()}"`
                  : 'Personalized recommendations'}
              </p>
              {isSearching && searchAnalysis ? (
                searchAnalysis.semanticMatches.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                    {searchAnalysis.semanticMatches.slice(0, 5).map(m => (
                      <RecCard
                        key={m.product.id}
                        rec={{
                          product: m.product,
                          matchPercent: m.matchPercent,
                          reason: `θ = ${m.angleDeg.toFixed(1)}° · ${m.isKeywordMatch ? 'Keyword + Vector' : 'Semantic Vector'}`,
                        }}
                        onClick={() => navigate(`/product/${m.product.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
                    Keep typing or try one of the semantic chips above.
                  </p>
                )
              ) : recs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                  {recs.map(r => <RecCard key={r.product.id} rec={r} onClick={() => navigate(`/product/${r.product.id}`)} />)}
                </div>
              ) : (
                <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Login and shop to get personalized picks!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

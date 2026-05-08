import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { ProductCard, RecCard } from '../components/ProductCard';
import store from '../engine/store';

export default function Shop() {
  const { products, engine, user, loading } = useApp();
  const navigate = useNavigate();
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState('name');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
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
  }, [engine, user, products]);

  if (loading) return <div className="section"><p>Loading...</p></div>;

  return (
    <>
      <div className="page-header"><h1>Shop</h1><p>Browse products — AI recommendations update as you shop</p></div>
      <div className="section">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
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
          <input className="form-input" style={{ width: 'auto', flex: 1, minWidth: 200 }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="two-col">
          <div>
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
              <div className="empty-state"><div className="empty-icon">🔍</div><h3>No products found</h3><p>Try a different search or category</p></div>
            )}
          </div>
          <div>
            <div className="glass sidebar" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '.3rem' }}>AI Picks For You</h3>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1rem' }}>Personalized recommendations</p>
              {recs.length > 0 ? (
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

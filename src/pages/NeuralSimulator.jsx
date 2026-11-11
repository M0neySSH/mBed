import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import store from '../engine/store';

const API_URL = import.meta.env.VITE_API_URL || '';

const LIVE_QUERY_CHIPS = [
  'morning breakfast',
  'bread',
  'caffeine boost',
  'gym workout',
  'late night coding',
  'fresh grooming',
];

const CATEGORY_COLORS = {
  Electronics: '#ff385c',
  'Food & Beverages': '#10b981',
  Clothing: '#6366f1',
  Books: '#f59e0b',
  'Sports & Fitness': '#0ea5e9',
  'Home & Living': '#8b5cf6',
  Miscellaneous: '#64748b',
};

const LAYER_COLORS = {
  content: '#ff385c',
  collaborative: '#6366f1',
  popularity: '#f59e0b',
  association: '#10b981',
};

const PRESET_SCENARIOS = [
  { label: '☕ Morning Ritual', ids: [15, 16] },
  { label: '🏋️ Home Fitness', ids: [29, 30] },
  { label: '💻 Desk Setup', ids: [5, 3] },
  { label: '📚 Dev Learning', ids: [20, 22] },
];

function colorForVal(v) {
  // Embeddings from MiniLM are roughly in [-0.18, +0.18]
  const clamped = Math.max(-0.16, Math.min(0.16, v));
  const intensity = Math.abs(clamped) / 0.16;
  if (clamped >= 0) {
    // Coral / Rose
    const alpha = 0.12 + intensity * 0.88;
    return `rgba(255, 56, 92, ${alpha.toFixed(2)})`;
  }
  // Indigo / Cool Blue
  const alpha = 0.12 + intensity * 0.88;
  return `rgba(79, 70, 229, ${alpha.toFixed(2)})`;
}

function EmbeddingHeatmap({ vector, title, subtitle }) {
  const [hoveredDim, setHoveredDim] = useState(null);
  if (!vector) return null;

  const dims = Array.from(vector);
  let norm = 0;
  for (let i = 0; i < dims.length; i++) norm += dims[i] * dims[i];
  norm = Math.sqrt(norm);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{title}</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {subtitle} · ‖v‖ = {norm.toFixed(3)}
        </span>
      </div>
      <div className="vec-heatmap" onMouseLeave={() => setHoveredDim(null)}>
        {dims.map((val, idx) => (
          <div
            key={idx}
            className="vec-cell"
            style={{ background: colorForVal(val) }}
            onMouseEnter={() => setHoveredDim({ idx, val })}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
        <span>
          <span style={{ color: '#4f46e5', fontWeight: 600 }}>■ Negative</span> &nbsp;
          <span style={{ color: '#ff385c', fontWeight: 600 }}>■ Positive</span>
        </span>
        <span>
          {hoveredDim
            ? `Dim #${hoveredDim.idx}: ${hoveredDim.val >= 0 ? '+' : ''}${hoveredDim.val.toFixed(5)}`
            : `Hover any of the ${dims.length} neurons to inspect`}
        </span>
      </div>
    </div>
  );
}

function AngleGauge({ angleDeg, rawCosine }) {
  // Draw vector A along 0 deg (horizontal right), vector B at angleDeg
  const cx = 36;
  const cy = 114;
  const r = 82;
  const rad = (Math.min(115, Math.max(0, angleDeg)) * Math.PI) / 180;
  const bx = cx + r * Math.cos(rad);
  const by = cy - r * Math.sin(rad);
  const arcR = 34;
  const axArc = cx + arcR;
  const ayArc = cy;
  const bxArc = cx + arcR * Math.cos(rad);
  const byArc = cy - arcR * Math.sin(rad);

  return (
    <svg viewBox="0 0 160 132" style={{ width: '100%', maxWidth: 180, display: 'block', margin: '0 auto' }}>
      <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke="#222222" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx + r} cy={cy} r="4" fill="#222222" />
      <text x={cx + r + 8} y={cy + 4} fontSize="11" fontWeight="700" fill="#222222">A</text>

      <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#ff385c" strokeWidth="3" strokeLinecap="round" />
      <circle cx={bx} cy={by} r="4" fill="#ff385c" />
      <text x={bx + 6} y={by - 4} fontSize="11" fontWeight="700" fill="#ff385c">B</text>

      {angleDeg > 2 && (
        <path
          d={`M ${axArc} ${ayArc} A ${arcR} ${arcR} 0 0 0 ${bxArc} ${byArc}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      )}
      <circle cx={cx} cy={cy} r="3.5" fill="#6366f1" />
      <text x={cx + 42} y={cy - 14} fontSize="11" fontWeight="700" fill="#6366f1">
        θ = {angleDeg.toFixed(1)}°
      </text>
      <text x={cx} y={18} fontSize="11" fill="#6a6a6a">
        cos(θ) = {rawCosine.toFixed(3)}
      </text>
    </svg>
  );
}

export default function NeuralSimulator() {
  const { products, engine, loading, addToCart } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || 'morning breakfast';

  const [liveQuery, setLiveQuery] = useState(initialQ);
  const [liveQueryVec, setLiveQueryVec] = useState({ query: '', vector: null });
  const [showQueryRays, setShowQueryRays] = useState(true);

  const [rawAnchorId, setAnchorId] = useState(1);
  const [rawCompareId, setCompareId] = useState(4);
  const [rawBasketIds, setBasketIds] = useState([15, 16]);
  const [mapClickMode, setMapClickMode] = useState('anchor'); // 'anchor' | 'compare' | 'basket'
  const [showCosineEdges, setShowCosineEdges] = useState(true);
  const [showAssocEdges, setShowAssocEdges] = useState(true);
  const [weights, setWeights] = useState({
    content: 0.35,
    collaborative: 0.50,
    popularity: 0.10,
    association: 0.45,
  });

  // Debounced fetch for real MiniLM query embedding when FastAPI backend is active
  useEffect(() => {
    const q = liveQuery.trim();
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
        // Fallback handled locally by RecommendationEngine
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [liveQuery]);

  const activeExternalQueryVec = useMemo(() => {
    const q = liveQuery.trim();
    return q && liveQueryVec.query === q ? liveQueryVec.vector : null;
  }, [liveQuery, liveQueryVec]);

  const querySim = useMemo(() => {
    const q = liveQuery.trim();
    if (!engine || !q) return null;
    return engine.semanticSearchAndRecommend(q, {
      externalVector: activeExternalQueryVec,
      topSemantic: 5,
      topNearest: 5,
    });
  }, [engine, liveQuery, activeExternalQueryVec]);

  const anchorId = useMemo(() => {
    if (!products.length) return rawAnchorId;
    return products.some(p => p.id === rawAnchorId) ? rawAnchorId : products[0].id;
  }, [products, rawAnchorId]);

  const compareId = useMemo(() => {
    if (!products.length) return rawCompareId;
    if (products.some(p => p.id === rawCompareId)) return rawCompareId;
    return products[1]?.id ?? products[0].id;
  }, [products, rawCompareId]);

  const basketIds = useMemo(() => {
    if (!products.length) return rawBasketIds;
    return rawBasketIds.filter(id => products.some(p => p.id === id));
  }, [products, rawBasketIds]);

  const anchorProduct = useMemo(() => products.find(p => p.id === anchorId), [products, anchorId]);
  const compareProduct = useMemo(() => products.find(p => p.id === compareId), [products, compareId]);

  const pca = useMemo(() => (engine ? engine.computePCA2D() : { points: [], project: () => null }), [engine]);

  const tasteVector = useMemo(
    () => (engine ? engine.getTasteVector(basketIds) : null),
    [engine, basketIds]
  );

  const tastePoint = useMemo(() => (tasteVector ? pca.project(tasteVector) : null), [pca, tasteVector]);
  const queryPoint = useMemo(
    () => (querySim?.queryVector ? pca.project(querySim.queryVector) : null),
    [pca, querySim]
  );

  const comparison = useMemo(
    () => (engine && anchorId && compareId ? engine.getVectorComparison(anchorId, compareId) : null),
    [engine, anchorId, compareId]
  );

  const similarNeighbors = useMemo(
    () => (engine && anchorId ? engine.getSimilarItems(anchorId, 5) : []),
    [engine, anchorId]
  );

  const assocTargetIds = useMemo(
    () => (engine && anchorId ? engine.getAssociationTargets(anchorId) : []),
    [engine, anchorId]
  );

  const simulatedRecs = useMemo(() => {
    if (!engine) return [];
    return engine.getSimulatedHybridRecommendations(basketIds, store.getAllPurchases(), weights, 6);
  }, [engine, basketIds, weights]);

  // Auto-pick a great semantic cross-item example if user clicks "Zero-Keyword Demo"
  const loadZeroKeywordDemo = () => {
    const coffee = products.find(p => p.id === 15) || products[0];
    const maker = products.find(p => p.id === 26) || products[1];
    const yoga = products.find(p => p.id === 29);
    const water = products.find(p => p.id === 31);
    if (yoga && water) {
      setAnchorId(yoga.id);
      setCompareId(water.id);
    } else if (coffee && maker) {
      setAnchorId(coffee.id);
      setCompareId(maker.id);
    }
  };

  const toggleBasketItem = (id) => {
    setBasketIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleMapNodeClick = (id) => {
    if (mapClickMode === 'anchor') setAnchorId(id);
    else if (mapClickMode === 'compare') setCompareId(id);
    else toggleBasketItem(id);
  };

  if (loading || !engine) {
    return <div className="section"><p>Loading neural embeddings...</p></div>;
  }

  const info = engine.getInfo();
  const categories = [...new Set(products.map(p => p.category))];

  return (
    <>
      <div className="page-header" style={{ paddingBottom: 'var(--sp-base)' }}>
        <div className="hero-badge" style={{ marginBottom: 12 }}>
          Interactive Neural Embedding & Hybrid AI Simulator
        </div>
        <h1>Inside DemoKART's 384-D Neural Brain</h1>
        <p>
          Traditional e-commerce uses rigid keyword matching. Explore how <strong>{info.model}</strong> projects
          products into <strong>{info.dimensions}-dimensional semantic space</strong> and merges 4 AI layers in real time.
        </p>
      </div>

      <div className="section" style={{ paddingTop: 'var(--sp-base)' }}>
        {/* REAL-TIME SEARCH-TO-EMBEDDING SIMULATOR */}
        <div className="lab-card" style={{ marginBottom: 'var(--sp-lg)', background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 18 }}>Real-Time Search-to-Neural Vector Simulator</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Type any search query or grocery intent to generate its live 384-D vector and see nearest-vector matches vs. traditional keyword search.
              </p>
            </div>
            {querySim && (
              <span className="tag" style={{ background: querySim.source === 'live-minilm' ? '#dcfce7' : '#e0f2fe', color: querySim.source === 'live-minilm' ? '#166534' : '#0369a1' }}>
                {querySim.source === 'live-minilm' ? 'Live PyTorch MiniLM-v2' : '384-D Local Vector Projection'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: 240 }}
              placeholder="Type a search query (e.g. 'morning breakfast', 'gym workout', 'bread')..."
              value={liveQuery}
              onChange={e => setLiveQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {LIVE_QUERY_CHIPS.map(chip => (
              <button
                key={chip}
                className={`lab-pill ${liveQuery.trim().toLowerCase() === chip ? 'active' : ''}`}
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setLiveQuery(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {querySim && querySim.queryVector ? (
            <div className="lab-grid-2">
              <div>
                <EmbeddingHeatmap
                  vector={querySim.queryVector}
                  title={`Live Query Embedding: "${querySim.query}"`}
                  subtitle="384-D Vector"
                />
                <div style={{ marginTop: 10, fontSize: 11, fontFamily: 'monospace', background: 'var(--canvas)', padding: 8, borderRadius: 6, border: '1px solid var(--hairline-soft)', color: 'var(--body)' }}>
                  Query Vector Preview: [{Array.from(querySim.queryVector).slice(0, 6).map(v => v.toFixed(4)).join(', ')}, …]
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 'var(--r-sm)', background: 'var(--surface-soft)', border: '1px solid var(--hairline)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Traditional Keyword Search ({querySim.keywordMatches.length})
                  </div>
                  {querySim.keywordMatches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {querySim.keywordMatches.slice(0, 5).map(p => (
                        <div key={p.id} style={{ fontSize: 12, padding: '4px 6px', background: 'var(--canvas)', borderRadius: 6, border: '1px solid var(--hairline-soft)' }}>
                          {p.emoji.startsWith('http') ? '📦' : p.emoji} {p.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--danger)' }}>
                      0 exact matches! Traditional substring matching fails when users describe intent instead of exact product titles.
                    </p>
                  )}
                </div>

                <div style={{ padding: 12, borderRadius: 'var(--r-sm)', background: 'var(--canvas)', border: '1px solid var(--hairline)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--primary)' }}>
                    Nearest Neural Vector Matches (Top 5)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {querySim.semanticMatches.map(m => (
                      <div
                        key={m.product.id}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '5px 8px', borderRadius: 6, background: 'var(--surface-soft)', cursor: 'pointer' }}
                        onClick={() => {
                          setAnchorId(m.product.id);
                          if (querySim.nearestVectorRecs[0]) setCompareId(querySim.nearestVectorRecs[0].product.id);
                        }}
                        title="Click to inspect this item's vector in X-Ray below"
                      >
                        <span>{m.product.emoji.startsWith('http') ? '📦' : m.product.emoji} {m.product.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {m.matchPercent}% · {m.angleDeg.toFixed(0)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Type a product name or shopping intent above to project it into 384-D vector space in real time.
            </p>
          )}
        </div>

        {/* CONTROL & PRESET BAR */}
        <div className="lab-card" style={{ marginBottom: 'var(--sp-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Product A (Anchor)</div>
              <select className="form-select" style={{ padding: '6px 10px', fontSize: 13 }} value={anchorId} onChange={e => setAnchorId(Number(e.target.value))}>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji.startsWith('http') ? '📦' : p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Product B (Compare)</div>
              <select className="form-select" style={{ padding: '6px 10px', fontSize: 13 }} value={compareId} onChange={e => setCompareId(Number(e.target.value))}>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji.startsWith('http') ? '📦' : p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadZeroKeywordDemo}>
              ✨ Semantic vs Keyword Demo
            </button>
            {PRESET_SCENARIOS.map(s => (
              <button
                key={s.label}
                className="lab-pill"
                onClick={() => {
                  const valid = s.ids.filter(id => products.some(p => p.id === id));
                  if (valid.length) {
                    setBasketIds(valid);
                    setAnchorId(valid[0]);
                  }
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4-STEP PIPELINE EXPLAINER */}
        <div className="lab-pipeline">
          <div className="lab-step">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <span className="lab-step-num">1</span>Text Serialization
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Product metadata is weighted & serialized before entering the Transformer:
            </p>
            <div style={{ fontSize: 11, fontFamily: 'monospace', background: 'var(--canvas)', padding: 8, borderRadius: 6, border: '1px solid var(--hairline-soft)', maxHeight: 82, overflowY: 'auto', color: 'var(--body)' }}>
              {engine.getSerializedText(anchorProduct)}
            </div>
          </div>

          <div className="lab-step">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <span className="lab-step-num">2</span>MiniLM-L6-v2 Vector
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Encoded into <strong>384 floating-point dimensions</strong> capturing meaning, not just spelling:
            </p>
            <div style={{ fontSize: 11, fontFamily: 'monospace', background: 'var(--canvas)', padding: 8, borderRadius: 6, border: '1px solid var(--hairline-soft)', color: 'var(--ink)' }}>
              [{Array.from(engine.embeddings[String(anchorId)] || []).slice(0, 6).map(v => v.toFixed(3)).join(', ')}, … ({info.dimensions} dims)]
            </div>
          </div>

          <div className="lab-step">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <span className="lab-step-num">3</span>Cosine Similarity
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Measures angle θ between A & B, with category-aware calibration (×1.15 same / ×0.75 cross):
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
              {comparison ? `${Math.round(comparison.adjustedScore * 100)}% Neural Match (θ = ${comparison.angleDeg.toFixed(1)}°)` : '—'}
            </div>
          </div>

          <div className="lab-step">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              <span className="lab-step-num">4</span>4-Layer Hybrid Fusion
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              Combines Content + Taste Vector + Popularity + Market Basket Association Rules:
            </p>
            <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
              Active Basket: {basketIds.length} item{basketIds.length === 1 ? '' : 's'} → Top Pick: {simulatedRecs[0]?.product.name || '—'}
            </div>
          </div>
        </div>

        {/* MAIN ROW 1: 2D PCA VECTOR SPACE MAP + VECTOR X-RAY COMPARISON */}
        <div className="lab-grid-2" style={{ marginBottom: 'var(--sp-xl)' }}>
          {/* LEFT: 2D PCA MAP */}
          <div className="lab-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 18 }}>2D Semantic Embedding Space (Live PCA from 384-D)</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Each dot is a product projected from 384D onto its top 2 principal components. Nearby items share semantic meaning.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'anchor', label: 'Click → Set A' },
                  { key: 'compare', label: 'Click → Set B' },
                  { key: 'basket', label: 'Click → ± Basket' },
                ].map(m => (
                  <button
                    key={m.key}
                    className={`lab-pill ${mapClickMode === m.key ? 'active' : ''}`}
                    onClick={() => setMapClickMode(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lab-map-wrap">
              <svg viewBox="0 0 700 440" style={{ width: '100%', height: 'auto', display: 'block' }}>
                {/* Subtle grid */}
                {[0.25, 0.5, 0.75].map(f => (
                  <g key={f}>
                    <line x1={700 * f} y1={0} x2={700 * f} y2={440} stroke="#e5e7eb" strokeDasharray="4 4" />
                    <line x1={0} y1={440 * f} x2={700} y2={440 * f} stroke="#e5e7eb" strokeDasharray="4 4" />
                  </g>
                ))}

                {/* Cosine similarity edges from Anchor A to Top-5 Neighbors */}
                {showCosineEdges && (() => {
                  const ptA = pca.points.find(p => p.product.id === anchorId);
                  if (!ptA) return null;
                  return similarNeighbors.map(n => {
                    const ptN = pca.points.find(p => p.product.id === n.product.id);
                    if (!ptN) return null;
                    return (
                      <g key={`cos-${n.product.id}`}>
                        <line
                          x1={ptA.x * 700}
                          y1={ptA.y * 440}
                          x2={ptN.x * 700}
                          y2={ptN.y * 440}
                          stroke="#ff385c"
                          strokeOpacity={0.35 + n.score * 0.55}
                          strokeWidth={1.5 + n.score * 2}
                        />
                        <text
                          x={((ptA.x + ptN.x) / 2) * 700}
                          y={((ptA.y + ptN.y) / 2) * 440 - 4}
                          fontSize="10"
                          fontWeight="600"
                          fill="#e00b41"
                          textAnchor="middle"
                        >
                          {n.matchPercent}%
                        </text>
                      </g>
                    );
                  });
                })()}

                {/* Layer 4 Association Rule dashed bridges */}
                {showAssocEdges && (() => {
                  const ptA = pca.points.find(p => p.product.id === anchorId);
                  if (!ptA) return null;
                  return assocTargetIds.map(tId => {
                    const ptT = pca.points.find(p => p.product.id === tId);
                    if (!ptT) return null;
                    return (
                      <line
                        key={`assoc-${tId}`}
                        x1={ptA.x * 700}
                        y1={ptA.y * 440}
                        x2={ptT.x * 700}
                        y2={ptT.y * 440}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                      />
                    );
                  });
                })()}

                {/* Product Nodes */}
                {pca.points.map(({ product, x, y }) => {
                  const px = x * 700;
                  const py = y * 440;
                  const isA = product.id === anchorId;
                  const isB = product.id === compareId;
                  const inBasket = basketIds.includes(product.id);
                  const color = CATEGORY_COLORS[product.category] || '#64748b';
                  return (
                    <g
                      key={product.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleMapNodeClick(product.id)}
                    >
                      <title>{`${product.name} (${product.category}) — $${product.price}`}</title>
                      {(isA || isB || inBasket) && (
                        <circle
                          cx={px}
                          cy={py}
                          r={isA ? 16 : 13}
                          fill="none"
                          stroke={isA ? '#222222' : isB ? '#ff385c' : '#6366f1'}
                          strokeWidth="2.5"
                        />
                      )}
                      <circle cx={px} cy={py} r={isA ? 9 : 7} fill={color} stroke="#ffffff" strokeWidth="1.5" />
                      {(isA || isB || inBasket) && (
                        <text x={px} y={py - 18} textAnchor="middle" fontSize="10" fontWeight="700" fill="#222222">
                          {isA ? 'A: ' : isB ? 'B: ' : '🛒 '}{product.name.slice(0, 18)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Dynamic User Taste Vector Centroid */}
                {tastePoint && (
                  <g>
                    <circle cx={tastePoint.x * 700} cy={tastePoint.y * 440} r="13" fill="#6366f1" fillOpacity="0.2" stroke="#6366f1" strokeWidth="2" />
                    <text x={tastePoint.x * 700} y={tastePoint.y * 440 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#4f46e5">
                      ★
                    </text>
                    <text x={tastePoint.x * 700} y={tastePoint.y * 440 + 24} textAnchor="middle" fontSize="10" fontWeight="700" fill="#4f46e5">
                      User Taste Vector
                    </text>
                  </g>
                )}

                {/* Live Search Query Vector & Rays */}
                {showQueryRays && queryPoint && querySim?.semanticMatches?.length > 0 && (
                  <g>
                    {querySim.semanticMatches.map(m => {
                      const ptM = pca.points.find(p => p.product.id === m.product.id);
                      if (!ptM) return null;
                      return (
                        <line
                          key={`qray-${m.product.id}`}
                          x1={queryPoint.x * 700}
                          y1={queryPoint.y * 440}
                          x2={ptM.x * 700}
                          y2={ptM.y * 440}
                          stroke="#0ea5e9"
                          strokeWidth="1.8"
                          strokeDasharray="4 3"
                          strokeOpacity="0.85"
                        />
                      );
                    })}
                    <polygon
                      points={`${queryPoint.x * 700},${queryPoint.y * 440 - 11} ${queryPoint.x * 700 + 11},${queryPoint.y * 440} ${queryPoint.x * 700},${queryPoint.y * 440 + 11} ${queryPoint.x * 700 - 11},${queryPoint.y * 440}`}
                      fill="#0ea5e9"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text x={queryPoint.x * 700} y={queryPoint.y * 440 - 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0284c7">
                      ◆ Query: &ldquo;{querySim.query.slice(0, 16)}&rdquo;
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Map Legend & Toggles */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
                {categories.map(c => (
                  <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: CATEGORY_COLORS[c] || '#64748b' }} />
                    {c}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showQueryRays} onChange={e => setShowQueryRays(e.target.checked)} />
                  Query Rays
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showCosineEdges} onChange={e => setShowCosineEdges(e.target.checked)} />
                  Cosine Links
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAssocEdges} onChange={e => setShowAssocEdges(e.target.checked)} />
                  Association Bridges
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT: PAIRWISE VECTOR X-RAY & TRADITIONAL KEYWORD VS NEURAL */}
          <div className="lab-card">
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Vector X-Ray: Neural vs. Traditional</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              Comparing <strong>{anchorProduct?.name}</strong> (A) vs <strong>{compareProduct?.name}</strong> (B)
            </p>

            {comparison && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center', background: 'var(--surface-soft)', padding: 12, borderRadius: 'var(--r-sm)', marginBottom: 14 }}>
                  <AngleGauge angleDeg={comparison.angleDeg} rawCosine={comparison.rawCosine} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Neural Similarity (Adjusted)</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
                        {Math.round(comparison.adjustedScore * 100)}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {comparison.sameCategory ? 'Same category (×1.15 boost)' : 'Cross-category (×0.75 penalty)'}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 6 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Traditional Keyword Overlap</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                        {Math.round(comparison.keywordOverlap * 100)}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Shared words: {comparison.sharedTokens.length ? comparison.sharedTokens.slice(0, 4).join(', ') : 'None (0 words!)'}
                      </div>
                    </div>
                  </div>
                </div>

                {comparison.keywordOverlap < 0.08 && comparison.rawCosine > 0.25 && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3', fontSize: 12, color: '#9f1239', marginBottom: 14 }}>
                    <strong>Why Neural Wins:</strong> Traditional keyword search finds almost zero overlap ({Math.round(comparison.keywordOverlap * 100)}%), yet 384-D embeddings capture shared context (raw cosine {comparison.rawCosine.toFixed(3)}).
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                  <EmbeddingHeatmap
                    vector={engine.embeddings[String(anchorId)]}
                    title={`Vector A: ${anchorProduct?.name}`}
                    subtitle={anchorProduct?.category}
                  />
                  <EmbeddingHeatmap
                    vector={engine.embeddings[String(compareId)]}
                    title={`Vector B: ${compareProduct?.name}`}
                    subtitle={compareProduct?.category}
                  />
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Top Contributing Dimensions (A[i] × B[i] → Dot Product = {comparison.dotProduct.toFixed(3)})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {comparison.topContributingDims.map(d => (
                    <div key={d.dim} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--surface-soft)', fontSize: 11, fontFamily: 'monospace' }}>
                      <div style={{ color: 'var(--muted)' }}>Dim #{d.dim}</div>
                      <div style={{ fontWeight: 700, color: d.prod >= 0 ? '#10b981' : '#e00b41' }}>
                        {d.prod >= 0 ? '+' : ''}{d.prod.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* MAIN ROW 2: INTERACTIVE 4-LAYER HYBRID SIMULATOR */}
        <div className="lab-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18 }}>4-Layer Hybrid Engine Simulator (Live Weight Tuning)</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Build a simulated user basket and adjust layer weights in real time to see how each AI layer shapes the final rankings.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
              <span><strong style={{ color: LAYER_COLORS.content }}>■</strong> L1 Content</span>
              <span><strong style={{ color: LAYER_COLORS.collaborative }}>■</strong> L2 Taste Vector</span>
              <span><strong style={{ color: LAYER_COLORS.popularity }}>■</strong> L3 Popularity</span>
              <span><strong style={{ color: LAYER_COLORS.association }}>■</strong> L4 Association Rules</span>
            </div>
          </div>

          <div className="lab-grid-2">
            {/* LEFT: BASKET BUILDER + WEIGHT SLIDERS */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                1. Simulated User Basket ({basketIds.length} items) — Click to toggle:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 165, overflowY: 'auto', padding: 10, background: 'var(--surface-soft)', borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
                {products.map(p => {
                  const active = basketIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      className={`lab-pill ${active ? 'active' : ''}`}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => toggleBasketItem(p.id)}
                    >
                      {p.emoji.startsWith('http') ? '📦' : p.emoji} {p.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                2. Tune Hybrid Layer Weights:
              </div>
              {[
                { key: 'content', label: 'Layer 1: Content-Based (Cosine Similarity)' },
                { key: 'collaborative', label: 'Layer 2: Collaborative (User Taste Centroid)' },
                { key: 'popularity', label: 'Layer 3: Global Popularity (Cold-Start Fallback)' },
                { key: 'association', label: 'Layer 4: Association Rules (Market Basket)' },
              ].map(s => (
                <div key={s.key} className="lab-slider-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{s.label}</span>
                    <strong>{weights[s.key].toFixed(2)}</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[s.key]}
                    onChange={e => setWeights(prev => ({ ...prev, [s.key]: parseFloat(e.target.value) }))}
                  />
                </div>
              ))}
            </div>

            {/* RIGHT: LIVE RANKED OUTPUT WITH STACKED LAYER BARS */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                3. Live Hybrid Recommendation Output (Top 6):
              </div>
              {simulatedRecs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Select at least 1 item in the simulated basket or raise Popularity weight.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {simulatedRecs.map((rec, idx) => {
                    const sum = rec.totalScore || 1;
                    return (
                      <div
                        key={rec.product.id}
                        style={{ padding: 12, borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)', background: 'var(--canvas)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate(`/product/${rec.product.id}`)}>
                            <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 13 }}>#{idx + 1}</span>
                            <span style={{ fontSize: 20 }}>{rec.product.emoji.startsWith('http') ? '📦' : rec.product.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{rec.product.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                {rec.product.category} · {rec.reasons.join(' · ')}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 14, color: 'var(--primary)' }}>{rec.matchPercent}%</strong>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => addToCart(rec.product.id)}>
                              + Cart
                            </button>
                          </div>
                        </div>
                        <div className="layer-bar-track" title={`L1:${rec.layers.content.toFixed(2)} L2:${rec.layers.collaborative.toFixed(2)} L3:${rec.layers.popularity.toFixed(2)} L4:${rec.layers.association.toFixed(2)}`}>
                          <div style={{ width: `${(rec.layers.content / sum) * 100}%`, background: LAYER_COLORS.content }} />
                          <div style={{ width: `${(rec.layers.collaborative / sum) * 100}%`, background: LAYER_COLORS.collaborative }} />
                          <div style={{ width: `${(rec.layers.popularity / sum) * 100}%`, background: LAYER_COLORS.popularity }} />
                          <div style={{ width: `${(rec.layers.association / sum) * 100}%`, background: LAYER_COLORS.association }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

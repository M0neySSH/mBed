/**
 * DemoKART 2.0 — Embedding-Based Recommendation Engine
 * Uses pre-computed neural embeddings from all-MiniLM-L6-v2
 * 
 * 4-Layer Hybrid Architecture:
 *   Layer 1: Content-Based      — Cosine similarity on MiniLM-v2 embeddings (similar items)
 *   Layer 2: Collaborative      — User taste profile vector (averaged purchase embeddings)
 *   Layer 3: Popularity         — Frequency-based trending items
 *   Layer 4: Association Rules  — Complementary products (Market Basket Analysis)
 *                                  e.g., Cigarette → Centerfresh, Coffee → Coffee Maker
 */

// ═══════════════════════════════════════════════════════════════
// ASSOCIATION RULES — Complementary product pairs
// These are cross-category relationships that cosine similarity
// CANNOT capture because semantically different items can still
// be frequently bought together.
// ═══════════════════════════════════════════════════════════════
const ASSOCIATION_RULES = {
  // Electronics complementary pairs
  5: [6],   6: [5],   // Keyboard ↔ Mouse (always bought together)
  1: [7],   7: [1],   // Earbuds ↔ Power Bank (need charging on-the-go)
  8: [7],             // Headphones → Power Bank
  2: [10, 31],        // Fitness Watch → Running Shoes, Water Bottle
  3: [25],  25: [3],  // USB Hub ↔ Desk Lamp (desk setup)

  // Food complementary pairs
  15: [26], 26: [15], // Coffee Beans ↔ Coffee Maker
  16: [18],           // Matcha → Dark Chocolate (tea time pairing)
  17: [31, 29],       // Protein Bars → Water Bottle, Yoga Mat (fitness bundle)

  // Clothing complementary
  10: [31, 30],       // Running Shoes → Water Bottle, Resistance Bands
  9: [14],  14: [9],  // Denim Jacket ↔ Sunglasses (outfit combo)
  11: [13],           // T-Shirt → Chino Pants

  // Books complementary
  20: [21], 21: [20], // Python → Clean Code (learning path)
  22: [20],           // AI/ML Handbook → Python Crash Course
  23: [21],           // Design Patterns → Clean Code

  // Sports fitness bundles
  29: [30, 31],       // Yoga Mat → Resistance Bands, Water Bottle
  30: [32],           // Resistance Bands → Jump Rope
  32: [31],           // Jump Rope → Water Bottle

  // Home setup
  27: [25],           // Plant Pot → Desk Lamp (home decor)
  28: [25],           // Wall Clock → Desk Lamp

  // Miscellaneous complementary pairs
  33: [34, 35],       // Cigarettes → Lighter, Centerfresh Chewing Gum
};

class RecommendationEngine {
  constructor(products, embeddingsData = null) {
    this.products = products;
    this.embeddings = {};
    this.similarityMatrix = {};
    this.modelInfo = { type: 'Neural', model: 'all-MiniLM-L6-v2', dimensions: 384 };

    if (embeddingsData && embeddingsData.items) {
      this.modelInfo = {
        type: 'Neural (sentence-transformers)',
        model: embeddingsData.model,
        dimensions: embeddingsData.dimension,
      };
      Object.keys(embeddingsData.items).forEach(id => {
        this.embeddings[id] = new Float64Array(embeddingsData.items[id]);
      });
    }
    this._fillMissingEmbeddings();
    this._buildSimilarityMatrix();
  }

  updateProducts(newProducts) {
    this.products = newProducts;
    this._fillMissingEmbeddings();
    this._buildSimilarityMatrix();
  }

  _fillMissingEmbeddings() {
    const dim = this.modelInfo.dimensions;
    if (!dim) return;

    // Calculate category averages
    const categoryAverages = {};
    const categoryCounts = {};

    this.products.forEach(p => {
      const emb = this.embeddings[String(p.id)];
      if (emb) {
        if (!categoryAverages[p.category]) {
          categoryAverages[p.category] = new Float64Array(dim);
          categoryCounts[p.category] = 0;
        }
        for (let i = 0; i < dim; i++) categoryAverages[p.category][i] += emb[i];
        categoryCounts[p.category]++;
      }
    });

    // Normalize category averages
    Object.keys(categoryAverages).forEach(cat => {
      const count = categoryCounts[cat];
      const avg = categoryAverages[cat];
      let norm = 0;
      for (let i = 0; i < dim; i++) {
        avg[i] /= count;
        norm += avg[i] * avg[i];
      }
      norm = Math.sqrt(norm);
      if (norm > 0) for (let i = 0; i < dim; i++) avg[i] /= norm;
    });

    // Compute global average fallback
    const globalAvg = new Float64Array(dim);
    let globalCount = 0;
    Object.keys(categoryAverages).forEach(cat => {
       const avg = categoryAverages[cat];
       for(let i=0; i<dim; i++) globalAvg[i] += avg[i];
       globalCount++;
    });
    if (globalCount > 0) {
      let norm = 0;
      for(let i=0; i<dim; i++) {
        globalAvg[i] /= globalCount;
        norm += globalAvg[i]*globalAvg[i];
      }
      norm = Math.sqrt(norm);
      if (norm > 0) for(let i=0; i<dim; i++) globalAvg[i] /= norm;
    }

    // Assign to missing products
    this.products.forEach(p => {
      if (!this.embeddings[String(p.id)]) {
        this.embeddings[String(p.id)] = categoryAverages[p.category] || globalAvg;
      }
    });
  }

  _buildSimilarityMatrix() {
    const ids = this.products.map(p => String(p.id));
    ids.forEach(id1 => {
      this.similarityMatrix[id1] = {};
      ids.forEach(id2 => {
        if (id1 === id2) {
          this.similarityMatrix[id1][id2] = 1.0;
        } else if (this.similarityMatrix[id2]?.[id1] !== undefined) {
          this.similarityMatrix[id1][id2] = this.similarityMatrix[id2][id1];
        } else {
          this.similarityMatrix[id1][id2] = this._cosineSimilarity(
            this.embeddings[id1], this.embeddings[id2]
          );
        }
      });
    });
  }

  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      nA += a[i] * a[i];
      nB += b[i] * b[i];
    }
    const d = Math.sqrt(nA) * Math.sqrt(nB);
    return d > 0 ? dot / d : 0;
  }

  // ═══════════ Layer 1: Content-Based (Cosine Similarity) ═══════════
  // Category-aware: same-category items get a boost, cross-category gets penalized.
  // This prevents false matches like T-Shirt ↔ Yoga Mat (share "premium", "eco")
  getSimilarItems(itemId, topN = 5) {
    const sims = this.similarityMatrix[String(itemId)];
    if (!sims) return [];
    const sourceProduct = this.products.find(p => p.id === parseInt(itemId));
    if (!sourceProduct) return [];

    return Object.entries(sims)
      .filter(([id]) => id !== String(itemId))
      .map(([id, rawScore]) => {
        const product = this.products.find(p => p.id === parseInt(id));
        if (!product) return null;

        // Category-aware adjustment
        const sameCategory = product.category === sourceProduct.category;
        const adjustedScore = sameCategory
          ? rawScore * 1.15   // 15% boost for same category
          : rawScore * 0.75;  // 25% penalty for cross-category

        return {
          product,
          score: Math.min(adjustedScore, 1),
          rawScore,
          matchPercent: Math.round(Math.min(adjustedScore, 1) * 100),
          reason: sameCategory
            ? 'Similar product (cosine similarity)'
            : `Cross-category match (${product.category})`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  // ═══════════ Layer 2: Collaborative Filtering (User Profile) ═══════════
  getUserRecommendations(purchasedItemIds, topN = 5) {
    if (!purchasedItemIds?.length) return [];
    const purchasedEmbeddings = purchasedItemIds
      .map(id => this.embeddings[String(id)])
      .filter(Boolean);
    if (!purchasedEmbeddings.length) return [];

    const dim = purchasedEmbeddings[0].length;
    const profile = new Float64Array(dim);
    purchasedEmbeddings.forEach(e => { for (let i = 0; i < dim; i++) profile[i] += e[i]; });
    for (let i = 0; i < dim; i++) profile[i] /= purchasedEmbeddings.length;
    const norm = Math.sqrt(profile.reduce((s, v) => s + v * v, 0));
    if (norm > 0) for (let i = 0; i < dim; i++) profile[i] /= norm;

    return this.products
      .filter(p => !purchasedItemIds.includes(p.id))
      .map(p => ({
        product: p,
        score: this._cosineSimilarity(profile, this.embeddings[String(p.id)] || []),
        reason: 'Matches your taste profile',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(r => ({ ...r, matchPercent: Math.round(r.score * 100) }));
  }

  // ═══════════ Layer 3: Popularity (Trending) ═══════════
  getPopularItems(allPurchases, topN = 5) {
    const freq = {};
    allPurchases.forEach(p => p.items?.forEach(i => {
      freq[i.productId] = (freq[i.productId] || 0) + i.qty;
    }));
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([id, count]) => ({
        product: this.products.find(p => p.id === parseInt(id)),
        score: Math.min(count / 10, 1),
        matchPercent: Math.round(Math.min(count / 10, 1) * 100),
        reason: `Popular (bought ${count} times)`,
      }))
      .filter(r => r.product);
  }

  // ═══════════ Layer 4: Association Rules (Complementary Products) ═══════════
  // This is Market Basket Analysis — finds products frequently bought TOGETHER
  // Unlike cosine similarity which finds SIMILAR items, this finds COMPLEMENTARY items
  // Example: Cigarette→Centerfresh, Coffee Beans→Coffee Maker, Keyboard→Mouse
  getComplementaryItems(itemId) {
    const rules = ASSOCIATION_RULES[itemId] || [];
    return rules
      .map(id => this.products.find(p => p.id === id))
      .filter(Boolean)
      .map(product => ({
        product,
        reason: 'Frequently bought together',
        confidence: 0.85 + Math.random() * 0.1, // Simulated confidence score
      }));
  }

  // Co-purchase mining from actual purchase history
  getCourchasedItems(itemId, allPurchases) {
    const coCount = {};
    allPurchases.forEach(purchase => {
      const itemIds = purchase.items.map(i => i.productId);
      if (!itemIds.includes(itemId)) return;
      itemIds.forEach(id => {
        if (id !== itemId) coCount[id] = (coCount[id] || 0) + 1;
      });
    });
    return Object.entries(coCount)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({
        product: this.products.find(p => p.id === parseInt(id)),
        count,
        reason: `Bought together ${count} time${count > 1 ? 's' : ''}`,
        confidence: Math.min(count / 5, 1),
      }))
      .filter(r => r.product);
  }

  // Combined: association rules + co-purchase data
  getFrequentlyBoughtTogether(itemId, allPurchases = []) {
    const results = new Map();

    // From predefined association rules
    this.getComplementaryItems(itemId).forEach(r => {
      results.set(r.product.id, {
        product: r.product,
        reason: r.reason,
        confidence: r.confidence,
        source: 'association-rule',
      });
    });

    // From actual co-purchase history
    this.getCourchasedItems(itemId, allPurchases).forEach(r => {
      if (results.has(r.product.id)) {
        const ex = results.get(r.product.id);
        ex.confidence = Math.min(1, ex.confidence + r.confidence * 0.3);
        ex.reason = `${ex.reason} (${r.count}× co-purchased)`;
      } else {
        results.set(r.product.id, {
          product: r.product,
          reason: r.reason,
          confidence: r.confidence,
          source: 'co-purchase',
        });
      }
    });

    return [...results.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);
  }

  // ═══════════ Hybrid: Merge ALL 4 Layers ═══════════
  getHybridRecommendations(purchasedItemIds, allPurchases, topN = 8) {
    const results = new Map();
    const hasPurchases = purchasedItemIds?.length > 0;

    if (hasPurchases) {
      // Layer 1: Content-based from each purchased item
      purchasedItemIds.forEach(itemId => {
        this.getSimilarItems(itemId, 5).forEach(r => {
          if (purchasedItemIds.includes(r.product.id)) return;
          const k = r.product.id;
          const ex = results.get(k);
          if (ex) { ex.score += r.score * 0.3; ex.reasons.add('Similar to items you bought'); }
          else results.set(k, { product: r.product, score: r.score * 0.3, reasons: new Set(['Similar to items you bought']) });
        });
      });

      // Layer 2: Collaborative (user profile)
      this.getUserRecommendations(purchasedItemIds, 10).forEach(r => {
        if (purchasedItemIds.includes(r.product.id)) return;
        const k = r.product.id;
        const ex = results.get(k);
        if (ex) { ex.score += r.score * 0.5; ex.reasons.add('Matches your taste profile'); }
        else results.set(k, { product: r.product, score: r.score * 0.5, reasons: new Set(['Matches your taste profile']) });
      });

      // Layer 4: Association rules (complementary items)
      purchasedItemIds.forEach(itemId => {
        this.getFrequentlyBoughtTogether(itemId, allPurchases).forEach(r => {
          if (purchasedItemIds.includes(r.product.id)) return;
          const k = r.product.id;
          const ex = results.get(k);
          if (ex) { ex.score += r.confidence * 0.4; ex.reasons.add('Frequently bought together'); }
          else results.set(k, { product: r.product, score: r.confidence * 0.4, reasons: new Set(['Frequently bought together']) });
        });
      });
    }

    // Layer 3: Popularity
    this.getPopularItems(allPurchases, 10).forEach(r => {
      if (purchasedItemIds?.includes(r.product.id)) return;
      const k = r.product.id;
      const ex = results.get(k);
      if (ex) { ex.score += r.score * 0.1; ex.reasons.add('Trending'); }
      else results.set(k, { product: r.product, score: r.score * 0.1, reasons: new Set(['Trending']) });
    });

    // Fill if needed
    if (results.size < topN) {
      this.products.forEach(p => {
        if (results.has(p.id) || purchasedItemIds?.includes(p.id)) return;
        if (results.size >= topN * 2) return;
        results.set(p.id, { product: p, score: Math.random() * 0.05, reasons: new Set(['You might like this']) });
      });
    }

    return [...results.values()]
      .map(r => ({ product: r.product, score: Math.min(r.score, 1), matchPercent: Math.round(Math.min(r.score, 1) * 100), reasons: [...r.reasons] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  explainRecommendation(productId, purchasedItemIds) {
    if (!purchasedItemIds?.length) return { reason: 'Popular item', matchPercent: 0 };

    // Check association rules first
    for (const pId of purchasedItemIds) {
      const assoc = ASSOCIATION_RULES[pId] || [];
      if (assoc.includes(productId)) {
        const p = this.products.find(p => p.id === pId);
        return { reason: `Goes with "${p?.name}" (complementary)`, similarTo: p, matchPercent: 85 };
      }
    }

    // Then cosine similarity
    let bestMatch = null, bestScore = 0;
    purchasedItemIds.forEach(pId => {
      const sim = this.similarityMatrix[String(pId)]?.[String(productId)] || 0;
      if (sim > bestScore) { bestScore = sim; bestMatch = this.products.find(p => p.id === pId); }
    });
    return {
      reason: bestMatch ? `Because you bought "${bestMatch.name}"` : 'Matches your preferences',
      similarTo: bestMatch,
      matchPercent: Math.round(bestScore * 100),
    };
  }

  getInfo() {
    return {
      ...this.modelInfo,
      totalProducts: this.products.length,
      associationRules: Object.keys(ASSOCIATION_RULES).length,
      layers: ['Content-Based (Cosine Similarity)', 'Collaborative Filtering', 'Popularity', 'Association Rules (Market Basket)'],
    };
  }

  // ═══════════ Simulator & X-Ray Helpers ═══════════
  getAssociationTargets(itemId) {
    return ASSOCIATION_RULES[itemId] || [];
  }

  getSerializedText(product) {
    if (!product) return '';
    const tags = (product.tags || []).join(' ');
    return `${product.name} ${product.description} [${product.category} ×2] [${tags} ×3]`;
  }

  _tokenize(product) {
    const raw = `${product.name} ${product.category} ${product.description} ${(product.tags || []).join(' ')}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ');
    const stop = new Set(['with', 'and', 'for', 'the', 'your', 'from', 'that', 'this', 'into', 'are', 'our']);
    return new Set(raw.split(/\s+/).filter(w => w.length > 2 && !stop.has(w)));
  }

  getVectorComparison(id1, id2) {
    const p1 = this.products.find(p => p.id === parseInt(id1));
    const p2 = this.products.find(p => p.id === parseInt(id2));
    const v1 = this.embeddings[String(id1)];
    const v2 = this.embeddings[String(id2)];
    if (!p1 || !p2 || !v1 || !v2) return null;

    let dot = 0, n1 = 0, n2 = 0;
    const contributions = [];
    for (let i = 0; i < v1.length; i++) {
      const prod = v1[i] * v2[i];
      dot += prod;
      n1 += v1[i] * v1[i];
      n2 += v2[i] * v2[i];
      contributions.push({ dim: i, a: v1[i], b: v2[i], prod });
    }
    const normA = Math.sqrt(n1);
    const normB = Math.sqrt(n2);
    const rawCosine = normA > 0 && normB > 0 ? Math.max(-1, Math.min(1, dot / (normA * normB))) : 0;
    const angleDeg = (Math.acos(rawCosine) * 180) / Math.PI;
    const sameCategory = p1.category === p2.category;
    const adjustedScore = Math.min(sameCategory ? rawCosine * 1.15 : rawCosine * 0.75, 1);

    // Traditional keyword overlap (Jaccard similarity) for comparison
    const t1 = this._tokenize(p1);
    const t2 = this._tokenize(p2);
    const sharedTokens = [...t1].filter(t => t2.has(t));
    const unionSize = new Set([...t1, ...t2]).size;
    const keywordOverlap = unionSize > 0 ? sharedTokens.length / unionSize : 0;

    contributions.sort((x, y) => Math.abs(y.prod) - Math.abs(x.prod));

    return {
      productA: p1,
      productB: p2,
      dotProduct: dot,
      normA,
      normB,
      rawCosine,
      angleDeg,
      sameCategory,
      adjustedScore,
      keywordOverlap,
      sharedTokens,
      topContributingDims: contributions.slice(0, 6),
    };
  }

  getTasteVector(itemIds) {
    if (!itemIds?.length) return null;
    const vecs = itemIds.map(id => this.embeddings[String(id)]).filter(Boolean);
    if (!vecs.length) return null;
    const dim = vecs[0].length;
    const avg = new Float64Array(dim);
    vecs.forEach(v => { for (let i = 0; i < dim; i++) avg[i] += v[i]; });
    for (let i = 0; i < dim; i++) avg[i] /= vecs.length;
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += avg[i] * avg[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < dim; i++) avg[i] /= norm;
    return avg;
  }

  computePCA2D() {
    const valid = this.products.filter(p => this.embeddings[String(p.id)]);
    if (valid.length < 2) return { points: [], project: () => ({ x: 0.5, y: 0.5 }) };

    const dim = this.embeddings[String(valid[0].id)].length;
    const n = valid.length;
    const mean = new Float64Array(dim);
    valid.forEach(p => {
      const v = this.embeddings[String(p.id)];
      for (let i = 0; i < dim; i++) mean[i] += v[i];
    });
    for (let i = 0; i < dim; i++) mean[i] /= n;

    const centered = valid.map(p => {
      const v = this.embeddings[String(p.id)];
      const c = new Float64Array(dim);
      for (let i = 0; i < dim; i++) c[i] = v[i] - mean[i];
      return c;
    });

    const powerIter = (deflateVec = null) => {
      let w = new Float64Array(dim);
      for (let i = 0; i < dim; i++) w[i] = Math.sin(i * 1.7 + (deflateVec ? 3.1 : 0.7));
      if (deflateVec) {
        let d = 0;
        for (let i = 0; i < dim; i++) d += w[i] * deflateVec[i];
        for (let i = 0; i < dim; i++) w[i] -= d * deflateVec[i];
      }
      let norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
      for (let i = 0; i < dim; i++) w[i] /= norm;

      for (let iter = 0; iter < 25; iter++) {
        const next = new Float64Array(dim);
        for (let r = 0; r < n; r++) {
          const row = centered[r];
          let proj = 0;
          for (let i = 0; i < dim; i++) proj += row[i] * w[i];
          for (let i = 0; i < dim; i++) next[i] += proj * row[i];
        }
        if (deflateVec) {
          let d = 0;
          for (let i = 0; i < dim; i++) d += next[i] * deflateVec[i];
          for (let i = 0; i < dim; i++) next[i] -= d * deflateVec[i];
        }
        norm = Math.sqrt(next.reduce((s, x) => s + x * x, 0)) || 1;
        for (let i = 0; i < dim; i++) w[i] = next[i] / norm;
      }
      return w;
    };

    const pc1 = powerIter();
    const pc2 = powerIter(pc1);

    const rawCoords = centered.map((row, idx) => {
      let x = 0, y = 0;
      for (let i = 0; i < dim; i++) {
        x += row[i] * pc1[i];
        y += row[i] * pc2[i];
      }
      return { product: valid[idx], rawX: x, rawY: y };
    });

    const xs = rawCoords.map(c => c.rawX);
    const ys = rawCoords.map(c => c.rawY);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const normalize = (rx, ry) => ({
      x: 0.08 + ((rx - minX) / spanX) * 0.84,
      y: 0.08 + ((ry - minY) / spanY) * 0.84,
    });

    const points = rawCoords.map(c => ({
      product: c.product,
      ...normalize(c.rawX, c.rawY),
    }));

    const project = (vec) => {
      if (!vec) return null;
      let rx = 0, ry = 0;
      for (let i = 0; i < dim; i++) {
        const diff = vec[i] - mean[i];
        rx += diff * pc1[i];
        ry += diff * pc2[i];
      }
      return normalize(rx, ry);
    };

    return { points, project };
  }

  getSimulatedHybridRecommendations(
    anchorIds,
    allPurchases = [],
    weights = { content: 0.3, collaborative: 0.5, popularity: 0.1, association: 0.4 },
    topN = 6
  ) {
    const results = new Map();
    const ensureEntry = (product) => {
      if (!results.has(product.id)) {
        results.set(product.id, {
          product,
          layers: { content: 0, collaborative: 0, popularity: 0, association: 0 },
          reasons: new Set(),
        });
      }
      return results.get(product.id);
    };

    if (anchorIds?.length) {
      // Layer 1: Content-Based
      anchorIds.forEach(itemId => {
        this.getSimilarItems(itemId, 8).forEach(r => {
          if (anchorIds.includes(r.product.id)) return;
          const entry = ensureEntry(r.product);
          entry.layers.content += r.score * weights.content;
          entry.reasons.add('L1: Cosine Similarity');
        });
      });

      // Layer 2: Collaborative (Taste Vector)
      this.getUserRecommendations(anchorIds, 12).forEach(r => {
        if (anchorIds.includes(r.product.id)) return;
        const entry = ensureEntry(r.product);
        entry.layers.collaborative += r.score * weights.collaborative;
        entry.reasons.add('L2: Taste Vector');
      });

      // Layer 4: Association Rules
      anchorIds.forEach(itemId => {
        this.getFrequentlyBoughtTogether(itemId, allPurchases).forEach(r => {
          if (anchorIds.includes(r.product.id)) return;
          const entry = ensureEntry(r.product);
          entry.layers.association += r.confidence * weights.association;
          entry.reasons.add('L4: Bought Together');
        });
      });
    }

    // Layer 3: Popularity
    this.getPopularItems(allPurchases, 12).forEach(r => {
      if (anchorIds?.includes(r.product.id)) return;
      const entry = ensureEntry(r.product);
      entry.layers.popularity += r.score * weights.popularity;
      entry.reasons.add('L3: Trending');
    });

    const maxRaw = Math.max(
      1,
      ...[...results.values()].map(
        e => e.layers.content + e.layers.collaborative + e.layers.popularity + e.layers.association
      )
    );

    return [...results.values()]
      .map(e => {
        const total = e.layers.content + e.layers.collaborative + e.layers.popularity + e.layers.association;
        return {
          product: e.product,
          totalScore: total,
          matchPercent: Math.round(Math.min(total / maxRaw, 1) * 100),
          layers: e.layers,
          reasons: [...e.reasons],
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, topN);
  }

  // ═══════════ Real-Time Semantic Query Vector & Nearest-Vector Search ═══════════
  _expandQueryTokens(query) {
    const LEXICON = {
      breakfast: ['milk', 'bread', 'butter', 'coffee', 'juice', 'tea'],
      morning: ['coffee', 'matcha', 'bread', 'butter', 'milk', 'juice', 'clock'],
      dairy: ['milk', 'butter', 'cream'],
      toast: ['bread', 'butter'],
      caffeine: ['coffee', 'espresso', 'matcha', 'tea', 'maker'],
      drink: ['coffee', 'matcha', 'juice', 'milk', 'water'],
      beverage: ['coffee', 'matcha', 'juice', 'milk', 'tea'],
      snack: ['chocolate', 'protein', 'bars', 'gum', 'mint'],
      sweet: ['chocolate', 'dark', 'cacao', 'gum'],
      gym: ['yoga', 'resistance', 'workout', 'fitness', 'water', 'protein', 'running', 'rope'],
      workout: ['yoga', 'resistance', 'bands', 'jump', 'rope', 'running', 'protein', 'water'],
      exercise: ['yoga', 'fitness', 'resistance', 'running', 'jump', 'rope'],
      cardio: ['running', 'shoes', 'jump', 'rope', 'water'],
      coding: ['python', 'programming', 'clean', 'keyboard', 'mouse', 'lamp', 'ai'],
      developer: ['python', 'clean', 'code', 'design', 'patterns', 'keyboard', 'mouse'],
      programming: ['python', 'clean', 'code', 'ai', 'design', 'patterns'],
      study: ['python', 'clean', 'ai', 'math', 'lamp', 'coffee', 'matcha'],
      desk: ['keyboard', 'mouse', 'lamp', 'usb', 'hub', 'clock'],
      office: ['keyboard', 'mouse', 'lamp', 'usb', 'chino'],
      music: ['earbuds', 'headphones', 'speaker', 'audio', 'bluetooth'],
      audio: ['earbuds', 'headphones', 'speaker', 'wireless'],
      travel: ['power', 'bank', 'earbuds', 'sunglasses', 'water', 'bottle'],
      grooming: ['facewash', 'deodorant', 'deodrant', 'perfume', 'fragrance', 'fresh'],
      smell: ['perfume', 'fragrance', 'deodorant', 'deodrant', 'freshener', 'odour'],
      hygiene: ['facewash', 'deodorant', 'gum', 'fresh', 'clean'],
      outfit: ['jacket', 'denim', 'tshirt', 'hoodie', 'chino', 'sunglasses'],
      winter: ['hoodie', 'jacket', 'fleece', 'warm', 'coffee', 'tea'],
      gift: ['chocolate', 'perfume', 'watch', 'earbuds', 'speaker', 'lamp'],
      grocery: ['milk', 'bread', 'butter', 'coffee', 'juice', 'chocolate', 'tea'],
    };

    const rawTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2);

    const expanded = new Map();
    rawTokens.forEach(tok => {
      expanded.set(tok, 1.0);
      Object.entries(LEXICON).forEach(([concept, words]) => {
        if (concept === tok || concept.startsWith(tok) || tok.startsWith(concept)) {
          words.forEach(w => {
            if (!expanded.has(w)) expanded.set(w, 0.72);
          });
        }
      });
    });

    return { rawTokens, expanded };
  }

  _trigramOverlap(a, b) {
    if (!a || !b || a.length < 2 || b.length < 2) return 0;
    const grams = (s) => {
      const padded = ` ${s.toLowerCase()} `;
      const set = new Set();
      for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
      return set;
    };
    const g1 = grams(a);
    const g2 = grams(b);
    let hits = 0;
    g1.forEach(g => { if (g2.has(g)) hits++; });
    return hits / Math.max(1, g1.size + g2.size - hits);
  }

  buildQueryVector(query, externalVector = null) {
    const cleaned = (query || '').trim();
    if (!cleaned) return { vector: null, source: 'empty', tokens: [], matchedAnchors: [] };

    if (Array.isArray(externalVector) && externalVector.length > 0) {
      const vec = new Float64Array(externalVector);
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
      for (let i = 0; i < vec.length; i++) vec[i] /= norm;
      const { rawTokens } = this._expandQueryTokens(cleaned);
      return { vector: vec, source: 'live-minilm', tokens: rawTokens, matchedAnchors: [] };
    }

    const { rawTokens, expanded } = this._expandQueryTokens(cleaned);
    const scored = this.products
      .map(p => {
        const text = `${p.name} ${p.category} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
        const nameLower = p.name.toLowerCase();
        let score = 0;
        expanded.forEach((weight, tok) => {
          if (nameLower.includes(tok)) score += 2.2 * weight;
          else if ((p.tags || []).some(t => t.toLowerCase().includes(tok))) score += 1.6 * weight;
          else if (text.includes(tok)) score += 1.0 * weight;
        });
        if (score === 0) {
          score = this._trigramOverlap(cleaned, `${p.name} ${(p.tags || []).join(' ')}`) * 1.4;
        }
        return { product: p, score };
      })
      .filter(s => s.score > 0.08)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (!scored.length) {
      return { vector: null, source: 'no-signal', tokens: rawTokens, matchedAnchors: [] };
    }

    const dim = this.modelInfo.dimensions || 384;
    const vec = new Float64Array(dim);
    scored.forEach(({ product, score }) => {
      const emb = this.embeddings[String(product.id)];
      if (emb) {
        for (let i = 0; i < dim; i++) vec[i] += emb[i] * score;
      }
    });
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    for (let i = 0; i < dim; i++) vec[i] /= norm;

    return {
      vector: vec,
      source: 'local-384d',
      tokens: rawTokens,
      matchedAnchors: scored.map(s => s.product),
    };
  }

  semanticSearchAndRecommend(query, { externalVector = null, topSemantic = 8, topNearest = 6 } = {}) {
    const cleaned = (query || '').trim();
    if (!cleaned) {
      return {
        query: '',
        queryVector: null,
        source: 'empty',
        tokens: [],
        keywordMatches: [],
        semanticMatches: [],
        nearestVectorRecs: [],
        anchorProduct: null,
      };
    }

    const qLower = cleaned.toLowerCase();
    const { rawTokens } = this._expandQueryTokens(cleaned);

    const keywordMatches = this.products.filter(p => {
      const haystack = `${p.name} ${p.category} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
      if (haystack.includes(qLower)) return true;
      return rawTokens.length > 0 && rawTokens.every(t => haystack.includes(t));
    });

    const { vector: queryVector, source, tokens } = this.buildQueryVector(cleaned, externalVector);
    const keywordIdSet = new Set(keywordMatches.map(p => p.id));

    let semanticMatches = [];
    if (queryVector) {
      semanticMatches = this.products
        .map(p => {
          const emb = this.embeddings[String(p.id)];
          const cos = emb ? Math.max(-1, Math.min(1, this._cosineSimilarity(queryVector, emb))) : 0;
          const angleDeg = (Math.acos(cos) * 180) / Math.PI;
          return {
            product: p,
            score: Math.max(0, cos),
            matchPercent: Math.round(Math.max(0, cos) * 100),
            angleDeg,
            isKeywordMatch: keywordIdSet.has(p.id),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topSemantic);
    }

    const anchorProduct = keywordMatches[0] || semanticMatches[0]?.product || null;
    const anchorEmb = anchorProduct ? this.embeddings[String(anchorProduct.id)] : null;
    const assocSet = new Set(anchorProduct ? (ASSOCIATION_RULES[anchorProduct.id] || []) : []);

    // Nearest vector recommendations excluding direct keyword matches (so below-search recommends NEW related items)
    const excludeIds = keywordMatches.length > 0 ? keywordIdSet : new Set();

    const nearestVectorRecs = (queryVector || anchorEmb)
      ? this.products
          .filter(p => !excludeIds.has(p.id))
          .map(p => {
            const emb = this.embeddings[String(p.id)];
            const simQuery = queryVector && emb ? Math.max(0, this._cosineSimilarity(queryVector, emb)) : 0;
            const simAnchor = anchorEmb && emb ? Math.max(0, this._cosineSimilarity(anchorEmb, emb)) : simQuery;
            const sameCategory = anchorProduct && p.category === anchorProduct.category;

            // Blend query embedding proximity + nearest item vector proximity
            let blended = keywordMatches.length > 0
              ? simAnchor * 0.65 + simQuery * 0.35
              : simQuery * 0.7 + simAnchor * 0.3;

            if (sameCategory) blended *= 1.1;
            const isAssoc = assocSet.has(p.id);
            if (isAssoc) blended = Math.max(blended, 0.78);

            const score = Math.min(blended, 1);
            const refCos = Math.max(-1, Math.min(1, anchorEmb ? simAnchor : simQuery));
            const angleDeg = (Math.acos(refCos) * 180) / Math.PI;

            const pText = `${p.name} ${p.category} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
            const hasRawToken = rawTokens.some(t => pText.includes(t));

            let reason = anchorProduct
              ? `Nearest 384-D vector to "${anchorProduct.name}" (θ = ${angleDeg.toFixed(1)}°)`
              : `Matches search embedding vector (θ = ${angleDeg.toFixed(1)}°)`;
            if (isAssoc && anchorProduct) {
              reason = `Bought together + vector link with "${anchorProduct.name}"`;
            }

            return {
              product: p,
              score,
              rawCosine: refCos,
              matchPercent: Math.round(score * 100),
              angleDeg,
              isAssoc,
              zeroKeywordMatch: !hasRawToken,
              reason,
            };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, topNearest)
      : [];

    return {
      query: cleaned,
      queryVector,
      source,
      tokens,
      keywordMatches,
      semanticMatches,
      nearestVectorRecs,
      anchorProduct,
    };
  }
}

export default RecommendationEngine;

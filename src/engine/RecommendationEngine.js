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
}

export default RecommendationEngine;

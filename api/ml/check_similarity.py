import json, numpy as np

prods = json.load(open('public/data/products.json', encoding='utf-8'))
emb = json.load(open('public/data/embeddings.json', encoding='utf-8'))
vecs = {k: np.array(v) for k, v in emb['items'].items()}

tshirt = next(p for p in prods if p['id'] == 11)
v1 = vecs['11']
print(f"Product: {tshirt['name']} ({tshirt['category']})")
print(f"\nTop similar products (with category-aware scoring):")
sims = []
for p in prods:
    if p['id'] == 11:
        continue
    v2 = vecs[str(p['id'])]
    cos = float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
    samecat = p['category'] == tshirt['category']
    adj = cos * 1.15 if samecat else cos * 0.75
    sims.append((p['name'], p['category'], cos, adj, samecat))
sims.sort(key=lambda x: -x[3])
for name, cat, raw, adj, same in sims[:8]:
    marker = 'SAME' if same else 'CROSS'
    print(f"  {adj*100:.1f}% (raw:{raw*100:.1f}%) [{marker}] {name} ({cat})")

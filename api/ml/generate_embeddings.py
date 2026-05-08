"""
DemoKART 2.0 — Neural Embedding Generator
Generates semantic embeddings using all-MiniLM-L6-v2 (sentence-transformers)

Usage:  python generate_embeddings.py
Output: ../public/data/embeddings.json
"""
import json, os, sys

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    products_path = os.path.join(script_dir, '..', 'public', 'data', 'products.json')

    with open(products_path, 'r', encoding='utf-8') as f:
        products = json.load(f)
    print(f"📦 Loaded {len(products)} products")

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("❌ Run: pip install sentence-transformers")
        sys.exit(1)

    model_name = 'all-MiniLM-L6-v2'
    print(f"🧠 Loading model: {model_name} ...")
    model = SentenceTransformer(model_name)

    texts = []
    for p in products:
        # IMPORTANT: Category is repeated to give it higher weight in the embedding.
        # This prevents cross-category false positives (e.g., T-Shirt ≠ Yoga Mat)
        # even when they share generic words like "premium" or "eco-friendly".
        category = p['category']
        tags = ', '.join(p.get('tags', []))
        text = (
            f"Category: {category}. {category}. {category}. "
            f"Tags: {tags}. {tags}. {tags}. "
            f"Product: {p['name']}. "
            f"Description: {p['description']}"
        )
        texts.append(text)

    print(f"🔄 Generating {len(texts)} embeddings...")
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)

    output = {
        "model": model_name,
        "dimension": int(embeddings.shape[1]),
        "total_products": len(products),
        "items": {str(p["id"]): embeddings[i].tolist() for i, p in enumerate(products)}
    }

    output_path = os.path.join(script_dir, '..', 'public', 'data', 'embeddings.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f)

    print(f"\n✅ Saved to: {output_path}")
    print(f"   Model: {model_name} | Dims: {output['dimension']} | Products: {len(products)}")

    import numpy as np
    print(f"\n🔍 Sample Similarities:")
    for i in range(min(3, len(products))):
        sims = [(products[j]['name'], float(np.dot(embeddings[i], embeddings[j])))
                for j in range(len(products)) if i != j]
        sims.sort(key=lambda x: -x[1])
        print(f"\n   '{products[i]['name']}':")
        for name, score in sims[:3]:
            print(f"     → {name}: {score*100:.1f}%")

if __name__ == '__main__':
    main()

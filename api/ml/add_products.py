import json

prods = json.load(open('public/data/products.json', encoding='utf-8'))
max_id = max(p['id'] for p in prods)
new_prods = [
  {
    'id': max_id + 1,
    'name': 'Premium Cigarettes',
    'category': 'Miscellaneous',
    'description': 'A pack of premium quality cigarettes.',
    'price': 8.99,
    'quantity': 100,
    'tags': ['tobacco', 'smoke'],
    'emoji': '🚬'
  },
  {
    'id': max_id + 2,
    'name': 'Refillable Lighter',
    'category': 'Miscellaneous',
    'description': 'A high-quality metal refillable lighter.',
    'price': 3.99,
    'quantity': 150,
    'tags': ['fire', 'accessories'],
    'emoji': '🔥'
  },
  {
    'id': max_id + 3,
    'name': 'Centerfresh Chewing Gum',
    'category': 'Food & Beverages',
    'description': 'Mint flavored liquid-filled chewing gum for fresh breath.',
    'price': 1.49,
    'quantity': 200,
    'tags': ['gum', 'mint', 'fresh'],
    'emoji': '🍬'
  }
]
prods.extend(new_prods)
with open('public/data/products.json', 'w', encoding='utf-8') as f:
    json.dump(prods, f, indent=2)

print(f"Added new products")

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DemoKART Recommendation API (Postgres)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")

# Load Model globally
print("Loading AI Model into memory...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded successfully!")

class Product(BaseModel):
    id: int
    name: str
    category: str
    description: str
    price: float
    quantity: int
    emoji: str
    tags: List[str]

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    print("Initializing Database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    print("Connected!")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT,
            category TEXT,
            description TEXT,
            price FLOAT,
            quantity INT,
            emoji TEXT,
            tags JSONB
        )
    """)
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS embeddings (
            product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
            embedding JSONB
        )
    """)
    conn.commit()
    
    # Check if empty
    cur.execute("SELECT COUNT(*) FROM products")
    if cur.fetchone()[0] == 0:
        print("Database is empty. Seeding from JSON...")
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        DATA_DIR = os.path.join(BASE_DIR, 'data')
        try:
            with open(os.path.join(DATA_DIR, 'products.json'), 'r', encoding='utf-8') as f:
                products = json.load(f)
            with open(os.path.join(DATA_DIR, 'embeddings.json'), 'r', encoding='utf-8') as f:
                embeddings_data = json.load(f)
            
            for p in products:
                cur.execute("""
                    INSERT INTO products (id, name, category, description, price, quantity, emoji, tags)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (p['id'], p['name'], p['category'], p['description'], p['price'], p['quantity'], p['emoji'], json.dumps(p.get('tags', []))))
                
                # Check if embedding exists
                str_id = str(p['id'])
                if 'items' in embeddings_data and str_id in embeddings_data['items']:
                    cur.execute("""
                        INSERT INTO embeddings (product_id, embedding)
                        VALUES (%s, %s)
                    """, (p['id'], json.dumps(embeddings_data['items'][str_id])))
            
            # Reset sequence
            cur.execute("SELECT setval(pg_get_serial_sequence('products', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM products")
            conn.commit()
            print("Seeding complete.")
        except Exception as e:
            print(f"Error seeding database: {e}")
            conn.rollback()

    cur.close()
    conn.close()
    print("Done")

@app.on_event("startup")
def startup_event():
    init_db()

def get_product_text(product: dict):
    tags_str = " ".join(product.get('tags', [])) * 3
    cat_str = product.get('category', '') * 2
    return f"{product.get('name', '')} {product.get('description', '')} {cat_str} {tags_str}"

def update_single_embedding(conn, product_dict: dict):
    text = get_product_text(product_dict)
    vector = model.encode([text])[0].tolist()
    
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO embeddings (product_id, embedding)
        VALUES (%s, %s)
        ON CONFLICT (product_id) DO UPDATE SET embedding = EXCLUDED.embedding
    """, (product_dict['id'], json.dumps(vector)))
    cur.close()

@app.get("/api/products")
def get_products(db = Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT * FROM products ORDER BY id ASC")
    products = cur.fetchall()
    cur.close()
    
    # Ensure tags is a list
    for p in products:
        if isinstance(p['tags'], str):
            p['tags'] = json.loads(p['tags'])
            
    return products

@app.get("/api/embeddings")
def get_embeddings(db = Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT product_id, embedding FROM embeddings")
    rows = cur.fetchall()
    cur.close()
    
    items = {}
    for row in rows:
        emb = row['embedding']
        if isinstance(emb, str):
            emb = json.loads(emb)
        items[str(row['product_id'])] = emb
        
    return {
        "model": "all-MiniLM-L6-v2",
        "dimension": 384,
        "items": items
    }

@app.post("/api/products")
def add_product(product: Product, db = Depends(get_db)):
    prod_dict = product.model_dump()
    cur = db.cursor()
    cur.execute("""
        INSERT INTO products (name, category, description, price, quantity, emoji, tags)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (prod_dict['name'], prod_dict['category'], prod_dict['description'], prod_dict['price'], prod_dict['quantity'], prod_dict['emoji'], json.dumps(prod_dict['tags'])))
    
    new_id = cur.fetchone()['id']
    prod_dict['id'] = new_id
    update_single_embedding(db, prod_dict)
    db.commit()
    cur.close()
    
    return {"success": True, "message": "Product added and AI updated instantly", "id": new_id}

@app.put("/api/products/{product_id}")
def update_product(product_id: int, product: Product, db = Depends(get_db)):
    prod_dict = product.model_dump()
    cur = db.cursor()
    cur.execute("SELECT id FROM products WHERE id = %s", (product_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Product not found")
        
    cur.execute("""
        UPDATE products SET
            name = %s, category = %s, description = %s, price = %s, quantity = %s, emoji = %s, tags = %s
        WHERE id = %s
    """, (prod_dict['name'], prod_dict['category'], prod_dict['description'], prod_dict['price'], prod_dict['quantity'], prod_dict['emoji'], json.dumps(prod_dict['tags']), product_id))
    
    prod_dict['id'] = product_id
    update_single_embedding(db, prod_dict)
    db.commit()
    cur.close()
    
    return {"success": True, "message": "Product updated and AI regenerated"}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db = Depends(get_db)):
    cur = db.cursor()
    cur.execute("DELETE FROM products WHERE id = %s RETURNING id", (product_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Embedding is cascade deleted
    db.commit()
    cur.close()
    
    return {"success": True, "message": "Product deleted"}

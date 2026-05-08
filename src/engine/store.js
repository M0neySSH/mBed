const KEYS = {
  USER: 'dk_user', CART: 'dk_cart', PURCHASES: 'dk_purchases',
  USERS_DB: 'dk_users', RATINGS: 'dk_ratings', PRODUCTS: 'dk_products',
};

const get = (key, fallback = null) => {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
};
const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const store = {
  // User session
  getUser: () => get(KEYS.USER),
  setUser: (u) => set(KEYS.USER, u),
  logout: () => localStorage.removeItem(KEYS.USER),
  isLoggedIn: () => !!get(KEYS.USER),

  // Users DB
  getAllUsers: () => get(KEYS.USERS_DB, []),
  addUser: (u) => { const users = get(KEYS.USERS_DB, []); users.push(u); set(KEYS.USERS_DB, users); },
  findUser: (id) => get(KEYS.USERS_DB, []).find(u => u.unique_id === id) || null,
  deleteUser: (id) => set(KEYS.USERS_DB, get(KEYS.USERS_DB, []).filter(u => u.unique_id !== id)),
  generateUniqueId: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id;
    do { id = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
    while (store.findUser(id));
    return id;
  },

  // Cart
  getCart: () => get(KEYS.CART, []),
  addToCart: (productId, qty = 1) => {
    const cart = get(KEYS.CART, []);
    const ex = cart.find(i => i.productId === productId);
    if (ex) ex.qty += qty; else cart.push({ productId, qty });
    set(KEYS.CART, cart);
  },
  updateCartQty: (productId, qty) => {
    let cart = get(KEYS.CART, []);
    if (qty <= 0) cart = cart.filter(i => i.productId !== productId);
    else { const item = cart.find(i => i.productId === productId); if (item) item.qty = qty; }
    set(KEYS.CART, cart);
  },
  removeFromCart: (id) => set(KEYS.CART, get(KEYS.CART, []).filter(i => i.productId !== id)),
  clearCart: () => set(KEYS.CART, []),
  getCartCount: () => get(KEYS.CART, []).reduce((s, i) => s + i.qty, 0),

  // Purchases
  getAllPurchases: () => get(KEYS.PURCHASES, []),
  getPurchases: (userId) => get(KEYS.PURCHASES, []).filter(p => p.userId === userId),
  addPurchase: (p) => { const all = get(KEYS.PURCHASES, []); all.push(p); set(KEYS.PURCHASES, all); },
  getUserPurchasedItemIds: (userId) => {
    const ids = new Set();
    get(KEYS.PURCHASES, []).filter(p => p.userId === userId)
      .forEach(p => p.items?.forEach(i => ids.add(i.productId)));
    return [...ids];
  },

  // Ratings
  getRatings: () => get(KEYS.RATINGS, []),
  rateItem: (userId, productId, rating) => {
    const ratings = get(KEYS.RATINGS, []);
    const ex = ratings.find(r => r.userId === userId && r.productId === productId);
    if (ex) ex.rating = rating;
    else ratings.push({ userId, productId, rating, date: new Date().toISOString() });
    set(KEYS.RATINGS, ratings);
  },
  getUserRating: (userId, productId) => {
    const r = get(KEYS.RATINGS, []).find(r => r.userId === userId && r.productId === productId);
    return r ? r.rating : 0;
  },
  getItemAvgRating: (productId) => {
    const ratings = get(KEYS.RATINGS, []).filter(r => r.productId === productId);
    return ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
  },

  // Products (mutable stock)
  getProducts: () => get(KEYS.PRODUCTS),
  setProducts: (p) => set(KEYS.PRODUCTS, p),
  updateProductStock: (productId, qty) => {
    const products = get(KEYS.PRODUCTS);
    if (!products) return;
    const p = products.find(p => p.id === productId);
    if (p) p.quantity = Math.max(0, p.quantity - qty);
    set(KEYS.PRODUCTS, products);
  },

  // Seed demo data
  seedDemoData: () => {
    if (store.getAllUsers().length > 0) return;
    const users = [
      { unique_id: 'DEMO01', name: 'Alice Johnson', email: 'alice@demo.com', phone: '9876543210', address: '123 Tech St' },
      { unique_id: 'DEMO02', name: 'Bob Smith', email: 'bob@demo.com', phone: '9876543211', address: '456 Fashion Ave' },
      { unique_id: 'DEMO03', name: 'Carol Lee', email: 'carol@demo.com', phone: '9876543212', address: '789 Book Lane' },
    ];
    users.forEach(u => store.addUser(u));
    store.addPurchase({ id: 'R001', userId: 'DEMO01', userName: 'Alice Johnson', date: '2026-05-01T10:00:00Z', items: [{ productId: 1, name: 'Wireless Bluetooth Earbuds Pro', price: 49.99, qty: 1 }, { productId: 5, name: 'Mechanical Gaming Keyboard', price: 74.99, qty: 1 }], total: 124.98 });
    store.addPurchase({ id: 'R002', userId: 'DEMO01', userName: 'Alice Johnson', date: '2026-05-03T14:00:00Z', items: [{ productId: 8, name: 'Noise Cancelling Headphones', price: 119.99, qty: 1 }], total: 119.99 });
    store.addPurchase({ id: 'R003', userId: 'DEMO02', userName: 'Bob Smith', date: '2026-05-02T09:00:00Z', items: [{ productId: 9, name: 'Classic Denim Jacket', price: 59.99, qty: 1 }, { productId: 10, name: 'Running Performance Shoes', price: 79.99, qty: 1 }], total: 139.98 });
    store.addPurchase({ id: 'R004', userId: 'DEMO03', userName: 'Carol Lee', date: '2026-05-04T16:00:00Z', items: [{ productId: 20, name: 'Python Crash Course', price: 29.99, qty: 1 }, { productId: 22, name: 'AI & ML Handbook', price: 39.99, qty: 1 }], total: 69.98 });
    [['DEMO01',1,5],['DEMO01',5,4],['DEMO01',8,5],['DEMO02',9,4],['DEMO02',10,5],['DEMO03',20,5],['DEMO03',22,4]].forEach(([u,p,r]) => store.rateItem(u,p,r));
  },
};

export default store;

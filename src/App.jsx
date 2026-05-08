import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import RecommendationEngine from './engine/RecommendationEngine';
import store from './engine/store';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Recommendations from './pages/Recommendations';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Sales from './pages/Sales';
import Checkout from './pages/Checkout';
import './index.css';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

const API_URL = import.meta.env.VITE_API_URL || '';

function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [engine, setEngine] = useState(null);
  const [user, setUser] = useState(store.getUser());
  const [cartCount, setCartCount] = useState(store.getCartCount());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [prodRes, embRes] = await Promise.all([
          fetch(`${API_URL}/api/products`),
          fetch(`${API_URL}/api/embeddings`).catch(() => null),
        ]);
        const prods = await prodRes.json();
        let embData = null;
        if (embRes && embRes.ok) embData = await embRes.json();

        setProducts(prods);
        store.seedDemoData();

        const rec = new RecommendationEngine(prods, embData);
        setEngine(rec);
      } catch (e) {
        console.error('Init error:', e);
      }
      setLoading(false);
    }
    init();
  }, []);

  const refreshCart = () => setCartCount(store.getCartCount());
  const refreshUser = () => setUser(store.getUser());
  const refreshProducts = async () => {
    try {
      const [prodRes, embRes] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/embeddings`).catch(() => null),
      ]);
      const prods = await prodRes.json();
      let embData = null;
      if (embRes && embRes.ok) embData = await embRes.json();
      
      setProducts(prods);
      if (engine) {
        if (embData) {
          // completely rebuild engine with new embeddings
          const rec = new RecommendationEngine(prods, embData);
          setEngine(rec);
        } else {
          engine.updateProducts(prods);
        }
      }
    } catch(e) { console.error('Failed to refresh products', e); }
  };

  const addToCart = (productId) => {
    const localProducts = store.getProducts() || products;
    const product = localProducts.find(p => p.id === productId);
    if (!product || product.quantity <= 0) { showToast('Out of stock', 'error'); return; }
    const cart = store.getCart();
    const inCart = cart.find(c => c.productId === productId);
    if (inCart && inCart.qty >= product.quantity) { showToast('Not enough stock', 'error'); return; }
    store.addToCart(productId, 1);
    refreshCart();
    showToast(`${product.name} added to cart!`);
  };

  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const value = { products, engine, user, cartCount, loading, addToCart, refreshCart, refreshUser, refreshProducts, showToast, toasts };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function ToastContainer() {
  const { toasts } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? '✅' : '❌'} {t.msg}
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>🛒 DemoKART 2.0 — AI-Powered Shopping with Embedding-Based Recommendations</p>
      <p style={{ marginTop: '.3rem' }}>
        Built with ❤️ by <a href="https://github.com/M0neySSH" target="_blank" rel="noreferrer">Manish</a> | Artificial Intelligence Project
      </p>
    </footer>
  );
}

function AppContent() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/checkout" element={<Checkout />} />
      </Routes>
      <Footer />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

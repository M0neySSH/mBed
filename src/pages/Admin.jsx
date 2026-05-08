import { useState } from 'react';
import { useApp } from '../App';
import store from '../engine/store';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Admin() {
  const { products, showToast, refreshProducts } = useApp();
  const [tab, setTab] = useState('products');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('isAdmin') === 'true');
  const [, forceUpdate] = useState(0);

  const localProducts = products; // use context products directly, managed by server sync
  const users = store.getAllUsers();

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newProduct = {
      id: Math.max(...products.map(p => p.id), 0) + 1,
      name: fd.get('name'), category: fd.get('category'), description: fd.get('desc'),
      price: parseFloat(fd.get('price')), quantity: parseInt(fd.get('qty')),
      emoji: fd.get('emoji') || '📦',
      tags: fd.get('tags') ? fd.get('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        if (refreshProducts) await refreshProducts();
        showToast('Product added & AI regenerated!');
        e.target.reset();
        setTab('products');
      } else {
        showToast('Failed to add product');
      }
    } catch (err) {
      showToast('Error connecting to server');
    }
    setIsGenerating(false);
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newUser = {
      unique_id: store.generateUniqueId(),
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      address: fd.get('address'),
    };
    store.addUser(newUser);
    showToast('User added!');
    e.target.reset();
    setTab('users');
    forceUpdate(n => n + 1);
  };


  const handleDeleteUser = (id) => { store.deleteUser(id); forceUpdate(n => n + 1); };

  const handleDeleteProduct = async (id) => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (refreshProducts) await refreshProducts();
        showToast('Product deleted & AI regenerated!');
      } else {
        showToast('Failed to delete product');
      }
    } catch (err) {
      showToast('Error connecting to server');
    }
    setIsGenerating(false);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...editingProduct,
      name: fd.get('name'),
      category: fd.get('category'),
      description: fd.get('desc'),
      price: parseFloat(fd.get('price')),
      quantity: parseInt(fd.get('qty')),
      emoji: fd.get('emoji') || '📦',
      tags: fd.get('tags') ? fd.get('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    setIsGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        if (refreshProducts) await refreshProducts();
        showToast('Product updated & AI regenerated!');
        setEditingProduct(null);
      } else {
        showToast('Failed to update product');
      }
    } catch (err) {
      showToast('Error connecting to server');
    }
    setIsGenerating(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pwd = fd.get('password');
    const msgUint8 = new TextEncoder().encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex === '2aa05adaca6e0a60d7bfc7128e24e74df2fb64ea1a707f6327f8dccef04baba9') {
       sessionStorage.setItem('isAdmin', 'true');
       setIsAuthenticated(true);
       showToast('Access Granted');
    } else {
       showToast('Invalid Password');
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className="page-header"><h1>Admin Login</h1><p>Restricted Area</p></div>
        <div className="section" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="glass" style={{ padding: '2rem', maxWidth: 400, width: '100%' }}>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Admin Password</label>
                <input type="password" name="password" className="form-input" required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Login</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header"><h1>Admin Panel</h1><p>Manage products, users, and inventory</p></div>
      <div className="section">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button className={`btn ${tab === 'products' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('products')}>📦 Products</button>
          <button className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('users')}>👥 Users</button>
          <button className={`btn ${tab === 'add' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('add')}>➕ Add Product</button>
          <button className={`btn ${tab === 'add_user' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('add_user')}>➕ Add User</button>
        </div>

        {tab === 'products' && !editingProduct && (
          <div className="glass" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Image/Emoji</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead>
              <tbody>
                {localProducts.map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      {p.emoji.startsWith('http') ? <img src={p.emoji} alt={p.name} style={{ width: 30, height: 30, borderRadius: '4px' }} /> : p.emoji}
                    </td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td style={{ color: 'var(--ink)', fontWeight: 600 }}>${p.price.toFixed(2)}</td>
                    <td style={{ color: p.quantity > 0 ? 'var(--ink)' : 'var(--danger)' }}>{p.quantity}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" style={{ marginRight: '.5rem' }} onClick={() => setEditingProduct(p)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'products' && editingProduct && (
          <div className="glass" style={{ padding: '2rem', maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Edit Product</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingProduct(null)}>Cancel</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" name="name" defaultValue={editingProduct.name} required /></div>
              <div className="form-group"><label className="form-label">Category</label>
                <select className="form-select" name="category" defaultValue={editingProduct.category}>
                  <option>Electronics</option><option>Clothing</option><option>Food & Beverages</option>
                  <option>Books</option><option>Home & Kitchen</option><option>Sports & Fitness</option><option>Miscellaneous</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" name="desc" defaultValue={editingProduct.description} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Price ($)</label><input type="number" className="form-input" name="price" step="0.01" min="0" defaultValue={editingProduct.price} required /></div>
                <div className="form-group"><label className="form-label">Quantity</label><input type="number" className="form-input" name="qty" min="0" defaultValue={editingProduct.quantity} required /></div>
              </div>
              <div className="form-group"><label className="form-label">Emoji or Image URL</label><input className="form-input" name="emoji" defaultValue={editingProduct.emoji} placeholder="📦 or https://..." /></div>
              <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input className="form-input" name="tags" defaultValue={(editingProduct.tags || []).join(', ')} placeholder="e.g. wireless, audio, premium" /></div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={isGenerating}>
                {isGenerating ? 'Regenerating AI...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {tab === 'users' && (
          <div className="glass" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Purchases</th><th>Action</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.unique_id}>
                    <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{u.unique_id}</td>
                    <td>{u.name}</td><td>{u.email}</td><td>{u.phone}</td>
                    <td>{store.getPurchases(u.unique_id).length}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.unique_id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'add' && (
          <div className="glass" style={{ padding: '2rem', maxWidth: 600 }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Add New Product</h3>
            <form onSubmit={handleAddProduct}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" name="name" required /></div>
              <div className="form-group"><label className="form-label">Category</label>
                <select className="form-select" name="category">
                  <option>Electronics</option><option>Clothing</option><option>Food & Beverages</option>
                  <option>Books</option><option>Home & Kitchen</option><option>Sports & Fitness</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" name="desc" required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">Price ($)</label><input type="number" className="form-input" name="price" step="0.01" min="0" required /></div>
                <div className="form-group"><label className="form-label">Quantity</label><input type="number" className="form-input" name="qty" min="0" required /></div>
              </div>
              <div className="form-group"><label className="form-label">Emoji or Image URL</label><input className="form-input" name="emoji" placeholder="📦 or https://..." /></div>
              <div className="form-group"><label className="form-label">Tags (comma-separated)</label><input className="form-input" name="tags" placeholder="e.g. wireless, audio, premium" /></div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={isGenerating}>
                {isGenerating ? 'Regenerating AI...' : 'Add Product'}
              </button>
            </form>
          </div>
        )}

        {tab === 'add_user' && (
          <div className="glass" style={{ padding: '2rem', maxWidth: 600 }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Add New User</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" name="name" required /></div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" name="email" required /></div>
              <div className="form-group"><label className="form-label">Phone</label><input type="tel" className="form-input" name="phone" required /></div>
              <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" name="address" required /></div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>Add User</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

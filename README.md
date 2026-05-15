<div align="center">
  <h1>🛒 DemoKART 2.0</h1>
  <p><strong>AI-Powered E-Commerce with Neural Embedding Recommendations</strong></p>

  [![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![PostgreSQL](https://img.shields.io/badge/Database-Neon%20Postgres-336791?style=flat-square&logo=postgresql)](https://neon.tech/)
  [![PyTorch](https://img.shields.io/badge/AI-PyTorch%20%2B%20MiniLM-EE4C2C?style=flat-square&logo=pytorch)](https://pytorch.org/)
</div>

<br/>

## 🚀 Overview
DemoKART 2.0 is a modern, full-stack E-Commerce platform that implements a production-grade machine learning recommendation engine. Instead of relying on basic keyword searches, DemoKART uses **Semantic Search & Neural Embeddings** to truly understand what a user is looking for, offering a "smart" shopping experience.

## ✨ Key Features
- **🧠 4-Layer AI Recommendation Engine:**
  - **Layer 1 (Content-Based):** Uses `all-MiniLM-L6-v2` to convert products into 384-dimensional mathematical vectors to find semantically similar items using Cosine Similarity.
  - **Layer 2 (Collaborative Profiling):** Averages the user's purchase history vectors into a "Personal Taste Vector".
  - **Layer 3 (Trending):** Tracks global purchase velocity across all users.
  - **Layer 4 (Association Rules):** Implements Market Basket Analysis to surface complementary goods (e.g. "Frequently Bought Together").
- **⚡ Real-time ML Inference:** The PyTorch model is loaded natively into the FastAPI memory pool, updating product embeddings in milliseconds without needing batch processing.
- **🛡️ Secure Admin Portal:** Password-protected dashboard with cryptographic SHA-256 hashing to manage inventory and user accounts safely.
- **🌐 Cloud-Native Persistence:** Fully stateless architecture persisting data to Neon Postgres.

---

## 📸 Screenshots

*(Replace these placeholders with your actual screenshots by dragging and dropping your images directly into the GitHub editor!)*

### Home Page & Recommendations
![Home Page Screenshot Placeholder](https://via.placeholder.com/800x400.png?text=Drag+and+drop+your+Home+Page+screenshot+here)

### AI-Powered Product Detail
![Product Screenshot Placeholder](https://via.placeholder.com/800x400.png?text=Drag+and+drop+your+Product+Page+screenshot+here)

### Admin Dashboard
![Admin Screenshot Placeholder](https://via.placeholder.com/800x400.png?text=Drag+and+drop+your+Admin+Dashboard+screenshot+here)

---

## 🏗 Architecture & Tech Stack

This repository uses a **Monorepo** structure:

```text
PROJECT_ROOT/
├── src/                  # React Frontend (Vercel)
│   ├── components/
│   ├── engine/           # Similarity Matrix & Rec Engine Math
│   └── pages/
├── api/                  # Python Backend (Render)
│   ├── main.py           # FastAPI Application
│   └── requirements.txt  # ML Dependencies
└── package.json          
```

- **Frontend:** React 19, Vite, React Router DOM, Vanilla CSS.
- **Backend:** Python 3, FastAPI, Uvicorn, psycopg2.
- **AI / ML:** PyTorch, `sentence-transformers` (`all-MiniLM-L6-v2`).
- **Database:** PostgreSQL (Hosted on Neon).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js installed
- Python 3 installed
- A Neon PostgreSQL Database URL

### 1. Setup the Backend
Navigate to the `api` folder and install the Python dependencies:
```bash
cd api
pip install -r requirements.txt
```
Create a `.env` file inside the `api/` folder:
```env
DATABASE_URL=postgresql://user:password@neon.tech/neondb
```

### 2. Setup the Frontend
Return to the root directory and install Node dependencies:
```bash
npm install
```

### 3. Start the Application
Start both the React frontend and the FastAPI backend simultaneously:
```bash
npm run dev
```
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

*(Note: On the very first boot, the FastAPI application will automatically seed your Postgres database with demo products!)*

---

## 🌐 Deployment 

This application is designed to be hosted globally using Edge & Web Services.

### 1. Backend (Render.com)
Deploy the backend as a **Web Service** on Render.
- **Root Directory:** `api`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- *Don't forget to add your `DATABASE_URL` as an Environment Variable!*

### 2. Frontend (Vercel)
Deploy the frontend natively on Vercel.
- Import the root folder of this repository.
- **Environment Variables:** Add `VITE_API_URL` and set it to your deployed Render URL (e.g. `https://demokart-api-xyz.onrender.com`).

<br/>
<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/M0neySSH">Manish</a> | Artificial Intelligence Project</p>
</div>

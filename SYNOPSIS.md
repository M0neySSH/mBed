<!-- 
  SPECIFICATIONS FOR SYNOPSIS
  - Font: Times New Roman, Size 12pt (Body), 14pt Bold (Headings), 12pt Normal (Sub-headings)
  - Paper: A4, single-side printing, double spacing
  - Margins: Left 3.5 cm, Top 2.5 cm, Right 1.25 cm, Bottom 1.25 cm
  - Language: English (British)
-->

---

<div align="center">

# **DemoKART 2.0: AI-Powered E-Commerce Platform with Neural Embedding-Based Recommendation Engine**

<br/>

### **BACHELOR OF TECHNOLOGY**

### Computer Science and Engineering

<br/><br/>

**SUBMITTED BY**

**Manish Bisht**
**Aayush Upadhyay**
**Bhawana Papnai**
**Aman Kumar**
**Utsav Mishra**

<br/>

**September 2026**

**Batch: 2023–2027**

<br/><br/>

### **DR. A.P.J. ABDUL KALAM GOVERNMENT INSTITUTE OF TECHNOLOGY, TANAKPUR**

</div>

---

<br/>

## Table of Contents

| Content | Page No. |
|---|---|
| Introduction | 1 |
| Rationale | 2 |
| Objectives | 2 |
| Literature Review | 3 |
| Feasibility Study | 4 |
| Methodology / Planning of Work | 5 |
| Facilities Required for Proposed Work | 6 |
| Expected Outcomes | 6 |
| References | 7 |

---

<br/>

## 1. Introduction

Electronic commerce has evolved rapidly over the past decade, and with it, the expectations of consumers have shifted from simple catalogue-based browsing to intelligent, personalised shopping experiences. Traditional e-commerce platforms rely heavily on rigid keyword-matching algorithms to power their search and recommendation features. For instance, a search query for "running shoes" will only return products that contain the exact words "running" and "shoes" in their metadata. This approach fails to capture the semantic relationships between products and severely limits the discoverability of relevant items.

**DemoKART 2.0** is a next-generation, AI-powered e-commerce platform that addresses this limitation by implementing a **Semantic Search and Neural Embedding-Based Recommendation Engine**. The platform leverages Natural Language Processing (NLP) techniques, specifically the `all-MiniLM-L6-v2` transformer model from the HuggingFace `sentence-transformers` library, to convert product attributes (name, description, category, and tags) into 384-dimensional mathematical vectors known as **embeddings**. Products that are conceptually similar occupy neighbouring positions in this high-dimensional vector space, enabling the system to recommend semantically related items even when they share zero common keywords. For example, if a user views a "Yoga Mat", the engine understands that "Dumbbells" and "Water Bottle" are contextually relevant recommendations.

The platform is built upon a modern **cloud-native monorepo architecture**, with a React.js frontend deployed on Vercel's global edge network and a Python FastAPI backend hosted on Render.com for machine learning inference. Product data and embeddings are persisted in a Neon-hosted PostgreSQL database, ensuring stateless operation and production-grade reliability. The project falls under the specialised domain of **Artificial Intelligence and Machine Learning applied to E-Commerce Systems**.

---

## 2. Rationale

The global e-commerce market is projected to exceed USD 8 trillion by 2027, yet a significant portion of online shoppers abandon their sessions due to irrelevant search results and poor product recommendations. Conventional recommendation systems, such as simple collaborative filtering or keyword-based search, suffer from the **cold-start problem** (inability to recommend for new users) and **semantic gap** (failure to understand contextual meaning). There is a clear need for an intelligent system that goes beyond surface-level keyword matching and truly understands the meaning behind product descriptions to deliver personalised, context-aware recommendations.

DemoKART 2.0 is justified by the need to bridge this semantic gap using accessible, open-source NLP models. By deploying the `all-MiniLM-L6-v2` model natively on the server (rather than relying on expensive third-party API calls), the platform demonstrates that production-quality AI-driven recommendations can be achieved cost-effectively. This project serves as a practical demonstration of how transformer-based embeddings can be integrated into a full-stack web application to solve a real-world industry problem, making it relevant for both academic research and commercial deployment.

---

## 3. Objectives

1. To design and develop a full-stack e-commerce web application with a modern, responsive user interface using React.js and a robust Python FastAPI backend.

2. To implement a **4-Layer Hybrid Recommendation Engine** comprising Content-Based Filtering (Cosine Similarity), Collaborative Filtering (User Taste Vector Profiling), Popularity/Trending Analysis, and Association Rules (Market Basket Analysis).

3. To integrate the `all-MiniLM-L6-v2` sentence-transformer model for real-time generation of 384-dimensional neural embeddings, enabling semantic product search and discovery.

4. To deploy the application on a cloud-native architecture (Vercel + Render.com + Neon PostgreSQL) and evaluate its performance, scalability, and recommendation accuracy in a production-like environment.

---

## 4. Literature Review

**[1] Devlin, J. et al. (2019) — "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding":**
This seminal paper introduced the BERT architecture, which demonstrated that pre-trained language models can be fine-tuned for a wide range of NLP tasks. BERT's bidirectional attention mechanism forms the theoretical foundation upon which modern sentence-transformer models, including the MiniLM variant used in this project, are built. The key contribution relevant to our work is the concept of contextualised word embeddings that capture semantic meaning beyond surface-level keywords.

**[2] Reimers, N. and Gurevych, I. (2019) — "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks":**
This paper proposed Sentence-BERT (SBERT), which modifies the BERT architecture using siamese and triplet network structures to produce semantically meaningful sentence embeddings that can be efficiently compared using Cosine Similarity. The `all-MiniLM-L6-v2` model used in DemoKART is a distilled variant of SBERT, offering an optimal balance between computational efficiency and embedding quality. This work directly informs our choice of embedding model and similarity computation strategy.

**[3] Linden, G., Smith, B. and York, J. (2003) — "Amazon.com Recommendations: Item-to-Item Collaborative Filtering":**
This industry paper from Amazon described the item-to-item collaborative filtering algorithm that powered early recommendation systems on one of the world's largest e-commerce platforms. The paper demonstrated that computing similarities between items (rather than between users) scales more effectively for large catalogues. Our Layer 1 (Content-Based Filtering) extends this concept by replacing traditional item feature vectors with neural embeddings for richer semantic comparison.

**[4] Agrawal, R. and Srikant, R. (1994) — "Fast Algorithms for Mining Association Rules":**
This foundational paper introduced the Apriori algorithm for mining frequent itemsets and generating association rules from transactional databases. The concept of "if a user buys X, they are likely to buy Y" directly underpins our Layer 4 (Association Rules / Market Basket Analysis), which maps predefined commercial relationships to recommend complementary products such as phone cases alongside smartphones.

**[5] Wang, W. et al. (2020) — "MiniLM: Deep Self-Attention Distillation for Task-Agnostic Compression of Pre-Trained Transformers":**
This paper presented MiniLM, a knowledge distillation method that compresses large transformer models into smaller, faster variants while retaining high accuracy. The `all-MiniLM-L6-v2` model used in this project is the direct output of this research, providing 384-dimensional embeddings with significantly reduced computational overhead compared to full-sized BERT models, making it feasible to run inference natively on resource-constrained servers.

---

## 5. Feasibility Study

**Technical Feasibility:**
The project is technically feasible as it utilises well-established, open-source technologies. The frontend is built with React.js (v19) and Vite, both of which are mature, well-documented frameworks. The backend uses Python 3 with FastAPI, a high-performance web framework designed for building APIs. The AI component relies on the pre-trained `all-MiniLM-L6-v2` model from HuggingFace, which requires no custom training and can be loaded directly into server memory for real-time inference. PostgreSQL, one of the most reliable relational database systems, is used for data persistence via the Neon serverless platform. All components have been individually validated and are compatible with one another.

**Operational Feasibility:**
The application is designed for ease of use. End users interact with a familiar e-commerce interface (product browsing, cart management, checkout), while administrators access a dedicated secure dashboard for inventory management. The system automatically generates AI embeddings upon product creation or update, requiring no manual intervention. The deployment architecture (Vercel for frontend, Render for backend) ensures near-zero maintenance overhead with automatic scaling and health monitoring.

**Economic Feasibility:**
The project uses entirely free and open-source software. Neon PostgreSQL offers a generous free tier suitable for development and moderate production workloads. Vercel provides free hosting for frontend applications, and Render.com offers a free tier for web services. The `all-MiniLM-L6-v2` model is open-source and runs on CPU, eliminating the need for expensive GPU infrastructure. The total cost of development and initial deployment is effectively zero, making this project highly economically viable.

**Schedule Feasibility:**
The project follows the academic timeline of the B.Tech programme (Batch 2023–2027). The development is planned across two semesters: the first semester focuses on research, design, and prototype development; the second semester focuses on full implementation, testing, deployment, and documentation. This timeline is achievable given the modular architecture and the use of pre-built components and models.

---

## 6. Methodology / Planning of Work

The project follows the **Agile Software Development Methodology** with iterative sprints, combined with principles from the **Software Development Life Cycle (SDLC)**. The research type is **Applied Research** with a focus on the practical application of NLP and machine learning techniques to e-commerce systems.

**Phase 1 — Requirement Analysis and Literature Survey (Weeks 1–3):**
Conduct a comprehensive review of existing recommendation systems, NLP models, and e-commerce architectures. Define functional and non-functional requirements. Identify the most suitable embedding model through comparative analysis.

**Phase 2 — System Design and Architecture (Weeks 4–5):**
Design the monorepo project structure, database schema (products and embeddings tables), API endpoints, and frontend component hierarchy. Create wireframes for the user interface and define the 4-layer recommendation pipeline.

**Phase 3 — Backend Development (Weeks 6–9):**
Implement the FastAPI server with PostgreSQL integration via psycopg2. Load the `all-MiniLM-L6-v2` model natively into server memory. Develop CRUD API endpoints for product management with automatic embedding generation on create/update operations. Implement database seeding logic for initial deployment.

**Phase 4 — Frontend Development (Weeks 10–13):**
Build the React.js application with Vite. Implement the product catalogue, shopping cart, product detail pages, and checkout flow. Develop the client-side recommendation engine with Cosine Similarity computation, user profiling (Taste Vector), trending analysis, and association rules. Build the secure Admin Dashboard with SHA-256 cryptographic authentication.

**Phase 5 — Integration, Testing, and Deployment (Weeks 14–16):**
Integrate frontend and backend via RESTful APIs. Perform unit testing, integration testing, and user acceptance testing. Deploy the frontend on Vercel and the backend on Render.com. Configure environment variables and CORS policies. Validate end-to-end recommendation accuracy.

**Tools for Data Collection and Analysis:**
- **Data Collection:** Product catalogues curated manually and from open-source datasets; user interaction data captured via client-side event tracking.
- **Analysis Tools:** Python (NumPy, PyTorch) for embedding computation; browser Developer Tools for frontend performance profiling; Swagger UI for API endpoint testing.

---

## 7. Facilities Required for Proposed Work

**Software Requirements:** Node.js (v18+), Python 3.10+, PostgreSQL (Neon Serverless), React.js 19, Vite 8, FastAPI, PyTorch (CPU build), HuggingFace sentence-transformers library, Git for version control, Visual Studio Code as the primary IDE, and modern web browsers (Chrome/Edge) for testing. Deployment platforms include Vercel (frontend hosting) and Render.com (backend hosting).

**Hardware Requirements:** Development machines with a minimum of 8 GB RAM (16 GB recommended for loading the ML model locally), multi-core processor (Intel i5 / AMD Ryzen 5 or above), 256 GB SSD storage, and a stable internet connection for accessing cloud-hosted database and deployment services. No GPU is required as the `all-MiniLM-L6-v2` model is optimised for CPU inference.

---

## 8. Expected Outcomes

Upon successful completion, the project is expected to deliver a fully functional, deployed AI-powered e-commerce platform that demonstrates the practical application of neural embeddings for product recommendation. The system shall be capable of generating semantically relevant product recommendations with measurably higher accuracy than traditional keyword-based approaches. The 4-layer hybrid recommendation engine is expected to effectively address the cold-start problem through its popularity and association rule layers whilst delivering personalised suggestions via collaborative user profiling. The project will serve as a scalable prototype that validates the feasibility of integrating transformer-based NLP models into real-time web applications, and will produce comprehensive documentation suitable for academic evaluation and future extension.

---

## 9. References

[1] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, "BERT: Pre-training of deep bidirectional transformers for language understanding," in *Proc. 2019 Conf. North Amer. Chapter Assoc. Comput. Linguistics: Human Lang. Technol. (NAACL-HLT)*, Minneapolis, MN, USA, 2019, pp. 4171–4186.

[2] N. Reimers and I. Gurevych, "Sentence-BERT: Sentence embeddings using siamese BERT-networks," in *Proc. 2019 Conf. Empirical Methods Natural Lang. Process. (EMNLP)*, Hong Kong, China, 2019, pp. 3982–3992.

[3] G. Linden, B. Smith, and J. York, "Amazon.com recommendations: Item-to-item collaborative filtering," *IEEE Internet Comput.*, vol. 7, no. 1, pp. 76–80, Jan./Feb. 2003.

[4] R. Agrawal and R. Srikant, "Fast algorithms for mining association rules," in *Proc. 20th Int. Conf. Very Large Data Bases (VLDB)*, Santiago de Chile, Chile, 1994, pp. 487–499.

[5] W. Wang, F. Wei, L. Dong, H. Bao, N. Yang, and M. Zhou, "MiniLM: Deep self-attention distillation for task-agnostic compression of pre-trained transformers," in *Proc. Adv. Neural Inf. Process. Syst. (NeurIPS)*, 2020, pp. 5776–5788.

[6] HuggingFace, "all-MiniLM-L6-v2 — Sentence Transformers Documentation," 2023. [Online]. Available: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2. [Accessed: Sept. 2026].

[7] S. Ramírez, "FastAPI Documentation," 2023. [Online]. Available: https://fastapi.tiangolo.com/. [Accessed: Sept. 2026].

---

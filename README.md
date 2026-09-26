# ✈️ Wayfari (Travel Buddy Finder) — Monorepo

Wayfari is a travel buddy matching application built with **React 18 + Vite**, **Supabase (PostgreSQL, Auth & Realtime)**, and a modular **Node.js Express** backend service.

---

## 📁 Repository Structure

```
wayfari/
├── frontend/                 # React 18 + Vite SPA (Client)
│   ├── src/
│   │   ├── components/       # UI Components (Navbar, BuddyCard, ChatWindow, etc.)
│   │   ├── pages/            # Page Views (Landing, Auth, ProfileWizard, FindBuddies, MyTrips, SafetyHub, Chat)
│   │   ├── context/          # State Management (AuthContext, BuddyContext, ChatContext, TripContext, ThemeContext)
│   │   ├── lib/              # Client Utilities & Supabase Client
│   │   └── App.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Express Service (Server-side privileged logic)
│   ├── src/
│   │   ├── config/           # Supabase Admin Client (Service Role Key)
│   │   ├── controllers/      # Matching & Safety Check-in Logic
│   │   ├── middleware/       # Auth verification & Error Handling
│   │   ├── routes/           # REST endpoints (/health, /api/matching, /api/checkin)
│   │   └── server.js
│   ├── package.json
│   └── .env.example
│
├── .gitignore
├── render.yaml               # Render Deployment Config
├── package.json              # Monorepo Workspace Configuration
└── README.md
```

---

## 🚀 Getting Started

### 1. Install All Dependencies
From the root directory, run:
```bash
npm run install:all
```

### 2. Configure Environment Variables
- **Frontend** (`frontend/.env`):
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```
- **Backend** (`backend/.env`):
  ```env
  PORT=5000
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
  ```

### 3. Run Development Servers
- Run both frontend and backend concurrently:
  ```bash
  npm run dev
  ```
- Or run frontend only:
  ```bash
  npm run dev:frontend
  ```

---

## 🌐 Deployment (Render)

- **Frontend**: Deployed on Render as a **Static Site** (`buildCommand: npm run build:frontend`, `staticPublishPath: ./frontend/dist`).
- **Database & Auth**: Handled by **Supabase**.

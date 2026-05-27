# ✈️ Wayfari — Find Your Perfect Travel Buddy

**Wayfari** is a full-stack travel companion web app that connects like-minded travelers through smart compatibility matching, real-time chat, trip planning, and built-in safety features.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-Animations-88CE02?logo=greensock&logoColor=white)

---

## 🌟 Features

### 🎯 Smart Buddy Matching
- Compatibility algorithm based on travel style, hobbies, music taste, and preferences
- Filter by destination, group size, trip duration, and more
- Percentage-based match scores for quick decision-making

### 💬 Real-Time Chat
- Instant messaging with matched travel buddies
- Conversation list with unread indicators
- Message timestamps and delivery status

### 🗺️ Trip Planning
- Create and manage trip itineraries
- Set destinations, dates, duration, and group size
- Track upcoming and past trips

### 🛡️ Safety Hub
- SOS emergency alert system
- Trusted safety contacts management
- Configurable check-in intervals
- Gender-aware safety features

### 👤 Profile System
- Multi-step profile setup wizard
- Avatar, bio, and travel preferences
- Hobby and music taste selection
- OAuth (Google/GitHub) + email/password authentication

### 🎨 Premium UI/UX
- Clean minimalist black & white design system
- GSAP scroll-triggered animations
- Framer Motion page transitions
- Particle canvas background effects
- Magnetic hover interactions
- Fully responsive (mobile-first)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite 5 |
| **Styling** | Vanilla CSS (custom design system with 17K+ lines) |
| **Animation** | GSAP 3 + ScrollTrigger + Framer Motion |
| **Backend** | Supabase (Authentication + PostgreSQL) |
| **Routing** | React Router v7 |
| **Deployment** | Render |

---

## 📂 Project Structure

```
src/
├── components/          # 25 reusable UI components
│   ├── Navbar.jsx       # Scroll-aware navigation with progress bar
│   ├── HeroSection.jsx  # Cinematic hero with parallax & particles
│   ├── ChatWindow.jsx   # Full messaging interface
│   ├── BuddyCard.jsx    # Match cards with compatibility scores
│   ├── ProfileWizard.jsx# Multi-step onboarding wizard
│   ├── SafetyHub.jsx    # Emergency & safety features
│   ├── Footer.jsx       # Site-wide footer
│   └── ...
├── pages/               # 8 route pages
│   ├── LandingPage.jsx  # Public landing with destinations
│   ├── AuthPage.jsx     # Login/signup with OAuth
│   ├── FindBuddiesPage  # Browse & filter matches
│   ├── ChatPage.jsx     # Messaging center
│   ├── MyTripsPage.jsx  # Trip management
│   └── ...
├── context/             # React Context providers
│   ├── AuthContext.jsx   # Auth state + Supabase integration
│   ├── ChatContext.jsx   # Chat state management
│   ├── BuddyContext.jsx  # Buddy matching logic
│   └── TripContext.jsx   # Trip CRUD operations
├── lib/
│   └── supabase.js      # Supabase client config
└── index.css            # Global design system (tokens, utilities, animations)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/wayfari.git
cd wayfari

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase URL and anon key to .env

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🗄️ Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Create a `profiles` table with the required columns
3. Enable Email/Password auth in Authentication settings
4. (Optional) Enable Google/GitHub OAuth providers
5. Add your project URL and anon key to `.env`

---

## 📱 Pages Overview

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Public homepage with hero, features, destinations |
| Auth | `/auth` | Login/signup with OAuth & email |
| Profile Setup | `/profile-setup` | Multi-step onboarding wizard |
| Find Buddies | `/find-buddies` | Browse and filter travel matches |
| Buddy Profile | `/buddy/:id` | Detailed buddy profile view |
| My Trips | `/my-trips` | Trip creation and management |
| Chat | `/chat` | Real-time messaging |
| Safety Hub | `/safety-hub` | Emergency contacts & SOS |

---

## 🎨 Design System

The app uses a custom CSS design system with:
- **CSS Custom Properties** — 50+ design tokens for colors, spacing, typography
- **Component Classes** — `.btn`, `.card`, `.chip`, `.pill-toggle`, `.form-input`
- **Utility Classes** — `.container`, `.grid--2/3/4`, `.animate-*`
- **Animation Library** — 15+ keyframe animations (fade, float, morph, shimmer)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

Built with ❤️ for our Travelling enthusiast

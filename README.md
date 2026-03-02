<h1 align="center">ChiExplore</h1>

<p align="center">
  <strong>Discover Chicago. One pin at a time.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#team">Team</a> •
  <a href="#license">License</a>
</p>

---

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/28986a5e-7487-4f27-b87c-3c56dedf68e8" autoplay muted loop playsinline width="600"></video>
</div>

---

## 🏙️ About

**ChiExplore** is a map-first discovery app built for **DemonHacks '26** that helps users explore the best of Chicago — restaurants, events, parks, pop-ups, volunteer opportunities, and curated city quests — all on one beautiful, interactive map.

Think **Beli meets scavenger hunt.** Open the map, see what's around you, save your favorites, and embark on curated quests that guide you through the city.

---

## Features

### 🗺️ Interactive Map
- Full-screen Mapbox GL map centered on Chicago with clustered pins
- Real-time CTA **L train tracker** with live positions on the map
- **Freehand drawing tool** — sketch a region on the map to filter spots within that area
- GeoJSON overlays for CTA rail lines, bus routes, bike routes, Divvy stations, and neighborhood boundaries

### 🔍 Explore & Filter
- Swipeable card feed with venue details, photos, and quick actions
- **Airbnb-style filter modal** — category, neighborhood, and distance filters
- Horizontal category chips for quick toggling
- Mapbox-powered **search** with place autocomplete

### 🧭 Quests
- Curated multi-stop exploration routes (e.g. *"Best Deep Dish Tour"*, *"Chicago Street Art Walk"*)
- GPS proximity-verified check-ins — be within ~100 m of a stop to check in
- XP rewards and progress tracking per quest

### 💬 Social
- Add friends, accept/decline requests
- Direct and group messaging with real-time updates via Supabase Realtime
- Share spots and events directly in chat
- **Signals** — broadcast short-lived notes at a place (e.g. *"Live DJ here right now!"*)

### 📌 Collections & Saves
- Bookmark any place or event
- Organize saves into named collections (*Date Night*, *Coffee Spots*, etc.)
- Default **Favorites** collection

### 🎫 Live Events
- Ticketmaster integration surfaces upcoming concerts, sports, and shows near Chicago
- Events appear as pins on the map alongside curated places

### 👤 Profiles & Onboarding
- Email/password and Google OAuth sign-in via Supabase Auth
- Onboarding flow to pick interest categories and set preferences (indoors/outdoors bias, crowd level, age gate)
- Editable profile with avatar, bio, and privacy settings

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Expo SDK 55 + React Native Web |
| **Router** | Expo Router (file-based) |
| **Language** | TypeScript |
| **Map** | Mapbox GL JS via `react-map-gl` |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **State** | Zustand |
| **Backend API** | Python / FastAPI |
| **APIs** | CTA Train Tracker, Google Places, Ticketmaster |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- A [Supabase](https://supabase.com) project with PostGIS enabled
- A [Mapbox](https://mapbox.com) access token
- *(Optional)* CTA, Google Places, and Ticketmaster API keys for live data

### 1. Clone the repo

```bash
git clone https://github.com/jshargo/DemonHacks_26.git
cd DemonHacks_26
```

### 2. Frontend setup

```bash
cd demonhacks
npm install
```

Create a `.env` file (see `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

Start the dev server:

```bash
npx expo start --web
```

### 3. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` in `backend/`:

```env
CTA_API_KEY=your-cta-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_PLACES_API_KEY=your-google-key
TICKETMASTER_API_KEY=your-ticketmaster-key
```

Run the API server:

```bash
uvicorn main:app --reload --port 8000
```

### 4. Database

Import `schema.sql` into your Supabase project, then seed data:

```bash
cd backend
python seed_places.py
```

---

## Architecture

```
DemonHacks_26/
├── demonhacks/            # Expo / React Native app
│   ├── app/               # File-based routes (Expo Router)
│   │   ├── (auth)/        #   Sign-in / sign-up screens
│   │   ├── (onboarding)/  #   Interest picker + preferences
│   │   ├── (tabs)/        #   Main tab navigator (Map, Quests, Collections, Social, Profile)
│   │   ├── chat/          #   Chat detail screen
│   │   ├── quest/         #   Quest detail screen
│   │   └── spot/          #   Spot detail screen
│   ├── components/        # Reusable UI components
│   │   ├── map/           #   MapView, markers, overlays, CTA layer, draw tool
│   │   ├── explore/       #   Card feed, filters modal, desktop layout
│   │   ├── quests/        #   Quest cards, route visualization
│   │   ├── social/        #   Friends list, chat bubbles
│   │   ├── spots/         #   Spot bottom sheet, detail cards
│   │   └── collections/   #   Collection cards, save buttons
│   ├── hooks/             # Data-fetching & business logic hooks
│   ├── stores/            # Zustand state stores
│   ├── lib/               # Supabase client, Mapbox config, utilities
│   ├── data/              # Static data & seed scripts
│   └── types/             # Shared TypeScript types
├── backend/               # Python FastAPI server
│   ├── main.py            #   CTA tracker, place materialization, Ticketmaster proxy
│   ├── seed_places.py     #   Seed curated Chicago places into Supabase
│   └── clear_places.py    #   Utility to clear place data
├── overlays/              # GeoJSON files (CTA lines, bike routes, neighborhoods, Divvy)
├── plans/                 # Product specs & design docs
└── schema.sql             # Supabase database schema (PostgreSQL + PostGIS)
```

### Database Schema (key tables)

| Table | Purpose |
|-------|---------|
| `places` | Venues and points of interest with PostGIS geography |
| `events` | Time-bound events linked to places |
| `quests` / `quest_steps` | Multi-stop exploration routes |
| `checkins` | GPS-verified user check-ins at places, events, or quest steps |
| `profiles` | User profiles extending Supabase Auth |
| `friendships` | Friend request system (pending / accepted / declined) |
| `chats` / `messages` | Direct and group messaging |
| `signals` | Short-lived user broadcasts at locations |
| `saved_items` | Bookmarked places and events |
| `collections` | Named user collections (via `collection_items`) |
| `user_preferences` | Weighted category/tag preferences |

---

## API Reference

The FastAPI backend runs on `localhost:8000` and serves as a proxy for external APIs.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/cta/trains` | Live positions of all CTA L trains |
| `GET` | `/api/cta/trains/{run_number}` | Upcoming stops for a specific train |
| `POST` | `/api/places/materialize` | Upsert a Mapbox search result into places DB |
| `POST` | `/api/places/batch-photos` | Backfill Google Places photos for places |
| `GET` | `/api/ticketmaster/events` | Upcoming events near Chicago |

---

## Team

Built at **DemonHacks '26** 🐉

---

## License

This project is licensed under the [MIT License](LICENSE).

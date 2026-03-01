# Implementation Plan: Chicago Event Discovery Map App — Project Setup

## Context

Setting up the full project scaffold for a Chicago event discovery map app for DemonHacks '26. The team (4+ people) needs a clean, modular codebase they can immediately split work across. The app uses Expo + React Native Web, Supabase (DB + Auth), and Mapbox. The spec has been written to `SPEC.md`.

This plan covers **project scaffolding and core infrastructure only** — not feature implementation. The goal is to get every team member unblocked with a running app skeleton.

---

## Step 1: Initialize Expo Project

- Run `npx create-expo-app@latest` with TypeScript template in the repo root (or a subfolder like `app/`)
- Use Expo Router (file-based routing) — select the tabs template
- Verify the project runs on web with `npx expo start --web`

**Output:** Working Expo app with tab navigation running in browser

## Step 2: Install Core Dependencies

```
npx expo install react-native-maps expo-location
npm install @supabase/supabase-js react-native-url-polyfill
npm install react-map-gl mapbox-gl
npm install zustand
npm install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
npm install expo-auth-session expo-web-browser expo-crypto
```

## Step 3: Update .gitignore

Replace the Python-focused `.gitignore` with a proper Expo/Node gitignore covering:
- `node_modules/`, `.expo/`, `dist/`, `web-build/`
- `.env` (already covered)
- Platform-specific build dirs

## Step 4: Set Up Environment Config

- Create `.env.example` with placeholder keys for `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Create `lib/supabase.ts` — Supabase client initialization
- Create `lib/mapbox.ts` — Mapbox config constants
- Create `lib/constants.ts` — Chicago center coords, category definitions, map bounds

## Step 5: Set Up Directory Structure

Create the folder scaffold matching the spec:

```
app/(auth)/ — auth screens (sign-in, sign-up)
app/(tabs)/ — main tab screens (map, quests, collections, profile)
app/quest/ — dynamic quest detail route
app/spot/ — dynamic spot detail route
components/map/
components/spots/
components/quests/
components/collections/
components/auth/
components/ui/
lib/
stores/
hooks/
data/seed/
```

Each directory gets placeholder files with typed interfaces and TODO comments so team members know exactly what to build.

## Step 6: Supabase Schema & Seed Data

- Create `supabase/schema.sql` with the full schema from SPEC.md (tables, RLS policies, indexes, PostGIS extension)
- Create `data/seed/spots.json` with ~30-50 curated Chicago venues
- Create `data/seed/quests.json` with 2-3 pre-built quests
- Create `data/seed/seed.ts` script that reads JSON and inserts into Supabase

## Step 7: TypeScript Types

Create `lib/types.ts` with interfaces matching the DB schema:
- `Spot`, `Quest`, `QuestStop`, `Collection`, `CollectionItem`, `QuestProgress`, `Profile`
- Category enum/union type
- Map viewport type

## Step 8: Auth Foundation

- Set up `stores/auth-store.ts` (Zustand) with auth state, sign-in/sign-up/sign-out actions
- Set up `components/auth/AuthGate.tsx` that redirects unauthenticated users to sign-in
- Wire auth gate into `app/_layout.tsx`
- Create stub sign-in/sign-up screens in `app/(auth)/`

## Step 9: Stub Zustand Stores

Create skeleton stores with typed state and placeholder actions:
- `stores/map-store.ts` — viewport, selected spot, active filters
- `stores/quest-store.ts` — active quest, progress
- `stores/collection-store.ts` — user collections, save/unsave actions

## Step 10: Stub Hooks

Create hooks with Supabase query skeletons:
- `hooks/useSpots.ts` — fetch spots with category filter
- `hooks/useQuests.ts` — fetch quests, fetch user progress
- `hooks/useCollections.ts` — CRUD collections and items
- `hooks/useLocation.ts` — device GPS via expo-location
- `hooks/useCheckIn.ts` — proximity check logic

## Step 11: Map Screen Foundation

- Set up `app/(tabs)/index.tsx` with `react-map-gl` rendering a Mapbox map
- Center on Chicago, apply map bounds
- Render stub pins from a hardcoded array (to verify map works before Supabase is connected)

## Step 12: Update CLAUDE.md

Update the project CLAUDE.md to reflect the new tech stack, project structure, and conventions for the team.

---

## Verification

1. `npx expo start --web` launches the app in browser
2. Tab navigation works (Map, Quests, Collections, Profile tabs)
3. Map renders centered on Chicago with Mapbox
4. Auth gate redirects to sign-in screen when not logged in
5. All TypeScript types compile without errors
6. Team members can start building their assigned modules immediately

---

## Key Files

| File | Purpose |
|------|---------|
| `SPEC.md` | Full product spec (already written) |
| `.gitignore` | Needs replacement (Python → Node/Expo) |
| `lib/supabase.ts` | Supabase client |
| `lib/types.ts` | Shared TypeScript types |
| `lib/constants.ts` | Chicago coords, categories |
| `stores/*.ts` | Zustand state stores |
| `hooks/*.ts` | Data fetching hooks |
| `supabase/schema.sql` | Database schema |
| `data/seed/*.json` | Seed data |
| `app/_layout.tsx` | Root layout with auth gate |

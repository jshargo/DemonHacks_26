# Onboarding Flow Spec Sheet

## Overview

A post-sign-in onboarding wizard to collect user preferences that personalize the discovery experience (map filters, recommended content, community matching). The flow runs **once** after account creation, and can be re-accessed from profile settings.

---

## Schema Changes Required

The current `users` table covers identity but has no preference columns. Two additions are needed:

### 1. Add `preferences` JSONB column to `public.users`

```sql
ALTER TABLE public.users
  ADD COLUMN preferences jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN onboarding_completed boolean DEFAULT false;
```

The `preferences` JSONB structure:

```json
{
  "cuisine_types": ["italian", "mexican", "sushi"],
  "price_range": ["$", "$$"],
  "event_types": ["music", "art", "food", "sports"],
  "activity_types": ["outdoor", "nightlife", "cultural"],
  "neighborhoods": ["wicker park", "logan square"],
  "notifications": {
    "events_nearby": true,
    "community_updates": true,
    "saved_spot_reminders": false
  }
}
```

### 2. Add `neighborhood` text column to `public.users`

```sql
ALTER TABLE public.users
  ADD COLUMN neighborhood text;
```

> This surfaces the user's primary neighborhood for quick filtering without JSONB lookups.

---

## Routing Structure

Add an `(onboarding)` route group alongside `(auth)` and `(tabs)`:

```
app/
├── (onboarding)/
│   ├── _layout.tsx          ← Stack navigator, no back gesture
│   ├── welcome.tsx          ← Step 0: Welcome splash
│   ├── location.tsx         ← Step 1: Neighborhood selection
│   ├── food-prefs.tsx       ← Step 2: Cuisine + price range
│   ├── event-prefs.tsx      ← Step 3: Event + activity types
│   ├── profile-setup.tsx    ← Step 4: Bio + avatar (optional)
│   └── complete.tsx         ← Step 5: Completion / CTA
```

---

## Redirect Logic

Modify `components/auth/AuthGate.tsx` (`useProtectedRoute`):

```
Authenticated + onboarding_completed = false  →  redirect to /(onboarding)/welcome
Authenticated + onboarding_completed = true   →  redirect to /(tabs)
Unauthenticated                               →  redirect to /(auth)/sign-in
```

The `onboarding_completed` flag is read from the `profile` object in `useAuthStore`. When the user completes the final step, it is set to `true` via a single Supabase `UPDATE`.

---

## Screen-by-Screen Specification

---

### Screen 0 — Welcome (`welcome.tsx`)

**Purpose:** Orient the user, set expectations for the onboarding steps.

**UI Elements:**
- App logo / hero illustration
- Headline: *"Let's personalize your experience"*
- Subtext: *"Just 4 quick steps so we can show you the right spots."*
- Progress indicator: `○ ○ ○ ○` (4 dots)
- Primary CTA button: **"Get Started"**
- Skip link: *"Skip for now"* (sets `onboarding_completed = true`, goes straight to `/(tabs)`)

**Data collected:** none

---

### Screen 1 — Location (`location.tsx`)

**Purpose:** Capture the user's home neighborhood and optionally their device location.

**UI Elements:**
- Headline: *"Where do you hang out?"*
- Multi-select chip grid of Chicago neighborhoods (static list ~20 options):
  - Wicker Park, Logan Square, Pilsen, Andersonville, Boystown, River North, Hyde Park, Lincoln Park, Bucktown, Bridgeport, Old Town, Streeterville, South Loop, Humboldt Park, Rogers Park, Ukrainian Village, Bronzeville, Lakeview, Uptown, Avondale
- Optional: *"Use my current location"* button → calls `expo-location`, reverse-geocodes to neighborhood, pre-selects matching chip
- Secondary text: *"Select up to 3 neighborhoods"* (max 3)
- Back / **"Next"** buttons

**Data stored:**
```json
{ "neighborhoods": ["wicker park", "logan square"] }
```
Also writes the first-selected neighborhood to `users.neighborhood`.

---

### Screen 2 — Food Preferences (`food-prefs.tsx`)

**Purpose:** Capture cuisine preferences and price comfort.

**UI Elements:**

**Section A — Cuisine Types** (multi-select chips, select any):
- Pizza, Mexican, Sushi, Italian, Thai, Indian, American, Mediterranean, Vietnamese, Ethiopian, Korean, Burgers, Brunch, Vegan, BBQ, Chinese, Greek, Sandwiches

**Section B — Price Range** (toggle pills, one or more):
- `$` Under $15 · `$$` $15–$30 · `$$$` $30+

- Back / **"Next"** buttons

**Data stored:**
```json
{ "cuisine_types": ["pizza", "mexican"], "price_range": ["$", "$$"] }
```

---

### Screen 3 — Events & Activities (`event-prefs.tsx`)

**Purpose:** Tailor the map and events feed.

**UI Elements:**

**Section A — Event Types** (multi-select chips):
- Music, Art, Food & Drink, Sports, Comedy, Nightlife, Festival, Family, Fitness, Film, Tech, Community

**Section B — Activity Types** (multi-select chips):
- Outdoor, Parks, Museums, Galleries, Shopping, Sports, Nightlife, Cultural, Live Music, Community

- Back / **"Next"** buttons

**Data stored:**
```json
{ "event_types": ["music", "food & drink"], "activity_types": ["outdoor", "cultural"] }
```

---

### Screen 4 — Profile Setup (`profile-setup.tsx`)

**Purpose:** Add a personal touch; all fields optional.

**UI Elements:**
- Avatar upload circle (tapping opens image picker via `expo-image-picker`)
  - Default state: letter initial from `display_name`
  - On upload: stores image to Supabase Storage bucket `avatars/`, writes URL to `users.avatar_url`
- Bio text input (multiline, 160 char limit, placeholder: *"Describe yourself in a sentence…"*)
- Back / **"Next"** buttons

**Data stored:**
- `users.avatar_url` (if uploaded)
- `users.bio` (if filled)

---

### Screen 5 — Complete (`complete.tsx`)

**Purpose:** Positive reinforcement; transition to the main app.

**UI Elements:**
- Checkmark animation (Reanimated or Lottie)
- Headline: *"You're all set!"*
- Subtext: *"We'll use your preferences to surface the best spots near you."*
- Primary CTA: **"Explore the Map"** → navigates to `/(tabs)`, sets `onboarding_completed = true`

**Data stored:**
- `users.onboarding_completed = true`
- Final `users.preferences` JSON (merged from all prior steps)

---

## State Management

Add an `onboarding-store.ts` Zustand store:

```typescript
interface OnboardingState {
  step: number;
  preferences: {
    neighborhoods: string[];
    cuisine_types: string[];
    price_range: string[];
    event_types: string[];
    activity_types: string[];
  };
  avatar_url: string | null;
  bio: string;
  setStep: (step: number) => void;
  updatePreferences: (partial: Partial<OnboardingState['preferences']>) => void;
  setBio: (bio: string) => void;
  setAvatarUrl: (url: string) => void;
  submit: () => Promise<void>;  // writes to Supabase, updates auth store profile
  reset: () => void;
}
```

The store accumulates selections across screens without writing to Supabase until `submit()` is called on the complete screen. This avoids partial writes if the user exits mid-flow.

---

## Supabase Write (Final Submit)

A single `upsert` on completion:

```typescript
await supabase
  .from('users')
  .update({
    bio,
    avatar_url,
    neighborhood: neighborhoods[0] ?? null,
    preferences: {
      neighborhoods,
      cuisine_types,
      price_range,
      event_types,
      activity_types,
    },
    onboarding_completed: true,
  })
  .eq('id', session.user.id);
```

After success, call `fetchProfile()` from `useAuthStore` to refresh the in-memory profile.

---

## UX Rules

| Rule | Detail |
|---|---|
| **Skip available** | Every screen has a "Skip" or "Skip for now" option. Skipping preserves already-entered data from prior steps. |
| **No forced back navigation** | The stack navigator disables back-swipe/hardware-back on all onboarding screens to prevent partial state. |
| **Re-entrant** | If user skips, `onboarding_completed` is set to `true` but preferences remain empty. User can revisit via Profile → "Edit Preferences". |
| **Progress bar** | 4-step linear progress bar shown on screens 1–4. Not shown on welcome or complete screens. |
| **No validation gates** | All selections are optional; "Next" is never disabled. |
| **Theming** | Uses existing `Colors.ts` light/dark tokens. Chips use entity accent colors: `#FF6B35` for food, `#9B5DE5` for events, `#00C49A` for activities. |

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `app/(onboarding)/_layout.tsx` | Create | Stack, gesture disabled |
| `app/(onboarding)/welcome.tsx` | Create | |
| `app/(onboarding)/location.tsx` | Create | |
| `app/(onboarding)/food-prefs.tsx` | Create | |
| `app/(onboarding)/event-prefs.tsx` | Create | |
| `app/(onboarding)/profile-setup.tsx` | Create | Needs `expo-image-picker` |
| `app/(onboarding)/complete.tsx` | Create | |
| `stores/onboarding-store.ts` | Create | Zustand store |
| `components/onboarding/ProgressBar.tsx` | Create | Reusable step indicator |
| `components/onboarding/ChipSelect.tsx` | Create | Reusable multi-select chip grid |
| `components/auth/AuthGate.tsx` | Modify | Add onboarding redirect logic |
| `stores/auth-store.ts` | Modify | Expose `onboarding_completed` from profile |
| `supabase/schema.sql` | Modify | Add `preferences`, `neighborhood`, `onboarding_completed` columns |

---

## Dependencies to Add

```bash
expo install expo-image-picker
```

`expo-location` is already listed in `package.json`. No other new dependencies required.

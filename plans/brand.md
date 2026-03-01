# ExploreChi: Complete Brand Identity & Frontend Restyle Plan

## Context

The current "DemonHacks" app has no centralized design system — all colors, fonts, spacing, and shadows are hardcoded across 40+ component files with at least 5 different accent colors (#6C63FF, #1a1a2e, #4285F4, #333, #222) and 9+ border color variants. This plan reskins the entire app into **ExploreChi**, a social city exploration app inspired by Airbnb's discoverability UX but with its own identity. Every route in `demonhacks/app/` and every component in `demonhacks/components/` will be updated.

---

## Brand Identity

| Attribute | Value |
|-----------|-------|
| **Name** | ExploreChi |
| **Wordmark** | "Expl**o**reChi" — compass SVG (`assets/compass.svg`) replaces the "o" |
| **Primary** | `#374DF5` (blue) |
| **White** | `#FFFFFF` |
| **Theme** | Light mode only |
| **Typography** | Satoshi (Regular 400, Medium 500, Bold 700, Black 900) |
| **Personality** | Approachable, clean, exploratory — Airbnb meets city guide |
| **Card Language** | 16px border radius + soft shadows |
| **Pin Style** | White circular icon badges with Lucide category icons |
| **Logo Usage** | Wordmark + loading animation only (restraint) |

---

## Phase 0: Dependencies & Assets

### Install packages
```bash
cd demonhacks && npm install lucide-react-native react-native-svg
```

### Download Satoshi font files to `demonhacks/assets/fonts/`
- `Satoshi-Regular.otf` (400)
- `Satoshi-Medium.otf` (500)
- `Satoshi-Bold.otf` (700)
- `Satoshi-Black.otf` (900)

Source: fontshare.com (free commercial license)

---

## Phase 1: Design System Foundation

### CREATE `demonhacks/lib/theme.ts`

Single source of truth for all design tokens. Exported as plain objects for `StyleSheet.create()` consumption.

**Colors:**
- `primary: '#374DF5'`, `primaryLight: '#EEF0FE'`, `primaryDark: '#2A3BC4'`
- Neutrals: `white`, `background (#FFF)`, `surface (#F7F7F8)`, `border (#E5E5EA)`, `borderLight (#F0F0F2)`
- Text: `textPrimary (#1A1A1A)`, `textSecondary (#6B6B6B)`, `textTertiary (#9B9B9B)`, `textInverse (#FFF)`
- Semantic: `success (#34C759)`, `warning (#FF9500)`, `error (#FF3B30)`
- Category colors preserved for badges: food (#FF6B35), outdoors (#00C49A), etc.
- Overlay: `rgba(0,0,0,0.4)`

**Typography** (font family + size + lineHeight objects):
- Display: Lg (32/38), Md (26/32), Sm (22/28)
- Heading: Lg (20/26), Md (18/24), Sm (16/22)
- Body: Lg (16/24), Md (14/20), Sm (12/16)
- Label: Lg (14/18), Md (12/16), Sm (10/14)
- Caption: (11/14)

**Spacing** (4px grid): xs(4), sm(8), md(12), lg(16), xl(20), 2xl(24), 3xl(32), 4xl(40), 5xl(48)

**Radii:** sm(8), md(12), lg(16), xl(20), full(9999)

**Shadows:** sm, md, lg, card (`0 2px 8px rgba(0,0,0,0.06)`), pin, fab

### MODIFY `demonhacks/constants/Colors.ts`
- Re-export from theme.ts, keeping same structure for backward compat

### MODIFY `demonhacks/app/_layout.tsx`
- Load 4 Satoshi font weights via `useFonts()`
- Remove DarkTheme — hardcode light theme
- Show compass loading animation while fonts load
- Set default header styles to use `fonts.bold` and `colors.primary`

### MODIFY `demonhacks/app/+html.tsx`
- Static white background (remove dark mode CSS)
- Inject `@font-face` for Satoshi web fonts
- Update `<title>` to "ExploreChi"

### MODIFY `demonhacks/lib/constants.ts`
- Update `PLACE_CATEGORIES` icon field to Lucide icon names (`utensils-crossed`, `tree-pine`, `shopping-bag`, `music`, `palette`, `heart`, `map-pin`)

### MODIFY `demonhacks/app.json`
- `name`: "ExploreChi", `slug`: "explorechi"

---

## Phase 2: Global Component Library

All created in `demonhacks/components/ui/`. Each imports tokens from `@/lib/theme`.

| # | Component | File | Purpose |
|---|-----------|------|---------|
| 1 | **Button** | `Button.tsx` | Variants: primary (blue bg), secondary (white + blue border), ghost (transparent), danger. Sizes: sm/md/lg. Props: leftIcon, loading, disabled, fullWidth |
| 2 | **TextInput** | `TextInput.tsx` | Label above, border input, focus = primary border, error state, helper text, leftIcon |
| 3 | **Badge** | `Badge.tsx` | Variants: filled, outlined, subtle. For category/difficulty/status badges |
| 4 | **Avatar** | `Avatar.tsx` | Sizes: sm(32), md(44), lg(64), xl(96). Image or initials fallback on primary bg |
| 5 | **Card** | `Card.tsx` | 16px radius, soft shadow, optional top image, onPress, highlighted state |
| 6 | **IconButton** | `IconButton.tsx` | Circular Lucide icon button. Variants: primary/ghost/outline. Active state |
| 7 | **Chip** | `Chip.tsx` | Pill shape, selected = primary bg, unselected = bordered. Replaces SubcategoryChip |
| 8 | **SearchPill** | `SearchPill.tsx` | Full-width pill with search icon + clear button. Airbnb-style |
| 9 | **FABSpeedDial** | `FABSpeedDial.tsx` | Primary-colored floating button, expands to 3 sub-actions (Save, Share, Directions) |
| 10 | **CustomTabBar** | `CustomTabBar.tsx` | 4-tab bar with Lucide icons, primary active color, clean white bar |
| 11 | **Header** | `Header.tsx` | Title + optional left/right actions. Satoshi bold. |
| 12 | **Divider** | `Divider.tsx` | 1px borderLight line with configurable spacing |
| 13 | **EmptyState** | `EmptyState.tsx` | Centered icon + title + subtitle + optional CTA button |
| 14 | **SkeletonLoader** | `SkeletonLoader.tsx` | Animated shimmer placeholder |
| 15 | **Wordmark** | `Wordmark.tsx` | "ExploChi" with compass SVG as "o". Primary color text. |
| 16 | **LoadingSpinner** | Update existing | Replace ActivityIndicator with rotating compass SVG |

---

## Phase 3: Navigation Restructure

### MODIFY `demonhacks/app/(tabs)/_layout.tsx`

**From 5 tabs to 4 tabs + FAB:**

| Position | Old | New | Lucide Icon |
|----------|-----|-----|-------------|
| 1 | Map | **Explore** | `Compass` |
| 2 | Quests | **Quests** | `Flag` |
| 3 | ~~Saved~~ | *(removed)* | — |
| 4 | Social | **Social** | `Users` |
| 5 | Profile | **Profile** | `User` |

- Collections tab: hide with `href: null` (keep file for direct nav from Profile)
- Use `CustomTabBar` component for tab bar rendering
- Active tint: `colors.primary`, inactive: `colors.textTertiary`
- Replace `expo-symbols` with `lucide-react-native`

### FAB Placement
- `DesktopLayout.tsx`: FAB in right (map) panel, bottom-right
- `MobileLayout.tsx`: FAB above bottom sheet, bottom-right
- Context-sensitive: shows Save/Share/Directions when a detail item is selected

---

## Phase 4: Screen-by-Screen Restyle

### Auth Screens
**MODIFY `app/(auth)/sign-in.tsx` & `sign-up.tsx`:**
- Add `<Wordmark>` at top
- Replace raw inputs with `<TextInput>` global component
- Replace pressable buttons with `<Button variant="primary">`
- All `#333` buttons -> `colors.primary`
- All `#4285F4` links -> `colors.primary`
- All `#e74c3c` errors -> `colors.error`
- Typography: `typography.displayMd` title, `typography.bodyLg` subtitle

### Onboarding Screens
**MODIFY `app/(onboarding)/interests.tsx` & `sub-interests.tsx`:**
- Continue/Finish buttons: `<Button variant="primary">` (was `#222222`)
- Selected category state: `colors.primary` border + `colors.primaryLight` bg (was dark)
- Chips: global `<Chip>` component with primary color selection
- All `#222222` -> `colors.primary`

**MODIFY `components/onboarding/CategoryCard.tsx`:**
- Selected: `colors.primary` border, `colors.primaryLight` bg, primary check dot
- Default border: `colors.border`

**MODIFY `components/onboarding/SubcategoryChip.tsx`:**
- Selected: `colors.primary` bg/border (was `#222222`)

### Explore Tab
**MODIFY `components/explore/DesktopLayout.tsx`:**
- Change from flex 1:1 to 40%/60% split (left feed / right map)
- Border: `colors.borderLight`
- Integrate FABSpeedDial

**MODIFY `components/explore/MobileLayout.tsx`:**
- Bottom sheet handle: `colors.border`
- Corners: `radii.xl`
- Integrate FABSpeedDial

**MODIFY `components/explore/TopBar.tsx`:**
- Border: `colors.borderLight`
- Add Wordmark on desktop (left of search)

**MODIFY `components/explore/SearchBar.tsx`:**
- Desktop: Above feed only (not map)
- Mobile: At very top
- Pill border: `colors.border`, focus: `colors.primary`
- Use `SearchPill` global component for the input portion

**MODIFY `components/explore/CategoryStrip.tsx`:**
- Active: `colors.primary` text + underline (was `#1a1a2e`)
- Replace emoji icons with Lucide icons
- Inactive: `colors.textTertiary`

**MODIFY `components/explore/DiscoverCard.tsx`:**
- Radius: `radii.lg` (16px)
- Shadow: `shadows.card`
- Highlighted border: `colors.primary` (was `#1a1a2e`)
- Typography: Satoshi tokens

**MODIFY `components/explore/DetailPanel.tsx`:**
- Action buttons: primary blue (was `#1a1a2e`)
- Tags: `colors.surface` bg
- Image radius: `radii.lg`
- Typography: `typography.displaySm` title

**MODIFY `components/explore/CardFeed.tsx`:**
- Count text: `colors.textPrimary`
- Switch track: `colors.primary`

### Map Components
**MODIFY `components/map/MapPin.tsx` (major redesign):**
- New design: 36x36 white circle with Lucide category icon centered
- 1px `colors.border` border, `shadows.pin` shadow
- Icon in `colors.textPrimary` (18px)
- Selected: `colors.primary` border + icon
- Map Lucide icons per category: UtensilsCrossed, TreePine, ShoppingBag, Music, Palette, Heart, Calendar, MapPin

**MODIFY `components/map/LabelPin.tsx`:**
- CSS injection: replace `#1a1a2e` with `colors.primary` in all CSS strings
- Add `font-family: 'Satoshi-Bold'`
- Selected bg: `colors.primary`

**MODIFY `components/map/CTAToggle.tsx`:**
- Active bg: `colors.primary` (was `#1a1a2e`)
- Replace emoji with Lucide icons (Train, Bus, Bike, Footprints, Ticket)
- Use `IconButton` global component

**MODIFY `components/map/MapView.tsx`:**
- 3D toggle: `colors.primary` active state
- Loading: compass animation via `LoadingSpinner`

### Social Components (all `#6C63FF` -> `colors.primary`)
**MODIFY `components/social/FriendCard.tsx`:** Avatar bg, message button, menu text
**MODIFY `components/social/ChatListItem.tsx`:** Avatar bg, unread dot
**MODIFY `components/social/MessageBubble.tsx`:** My bubble bg, their = `colors.surface`
**MODIFY `components/social/SpotShareCard.tsx`:** Border, label color
**MODIFY `components/social/FriendRequestCard.tsx`:** Accept button
**MODIFY `components/social/NewChatModal.tsx`:** All accent colors

### Social Screen
**MODIFY `app/(tabs)/social.tsx`:**
- Header: `typography.displaySm`
- Add/New buttons: `<Button variant="primary" size="sm">`
- Tab active: `colors.primary` (was `#6C63FF`)
- Empty state: `<EmptyState>` global component

### Quests Screen & Components
**MODIFY `app/(tabs)/quests.tsx`:**
- Card: `<Card>` with 16px radius, white bg + shadow (was `#f8f8f8` flat)
- Typography: Satoshi tokens
- Difficulty badge: `<Badge>` global component

**MODIFY `components/quests/QuestCard.tsx`:**
- Same as above + `<Card>` wrapper
- Progress: `colors.success`

### Quest Detail
**MODIFY `app/quest/[id].tsx`:**
- Stop circles: `colors.primary` (was `#9B5DE5`)
- Stop card bg: `colors.surface`
- Badges: `<Badge>` global component

### Profile & Edit Screens
**MODIFY `app/(tabs)/profile.tsx`:**
- Root bg: `colors.surface`, panel bg: white
- Avatar fallback: `colors.primary` (was `#333`)
- Nav active: `colors.primary` left border
- Save button: `<Button variant="primary">`
- Input borders: `colors.border`
- Sign out: `colors.textTertiary`
- Add "View Saved" section that navigates to collections screen

**MODIFY `app/edit-profile.tsx`:**
- Use global `<Header>`, `<TextInput>`, `<Avatar>`
- Save: `colors.primary`

**MODIFY `app/edit-preferences.tsx`:**
- Global `<Header>`, `<Chip>` components
- Save: `colors.primary`

### Chat & Friends
**MODIFY `app/chat/[id].tsx`:**
- Send button: `colors.primary` (was `#6C63FF`)
- Input bg: `colors.surface`

**MODIFY `app/friends/search.tsx`:**
- Search/Add buttons: `colors.primary`
- Avatar: global `<Avatar>`

### Collections
**MODIFY `app/(tabs)/collections.tsx`:**
- Hide from tab bar but keep accessible
- Restyle with theme tokens

**MODIFY `components/collections/SaveButton.tsx`:**
- Replace Unicode heart with Lucide `Heart` icon
- Saved color: `colors.error` (red)

### Spot Detail
**MODIFY `app/spot/[id].tsx`:**
- Flesh out stub using DetailPanel pattern
- Global `Card`, `Badge`, `Button` components

---

## Phase 5: Cleanup

### Files to potentially delete:
- `components/collections/CollectionCard.tsx` (placeholder, empty)
- `components/collections/AddToCollection.tsx` (placeholder, empty)
- `assets/fonts/SpaceMono-Regular.ttf` (replaced by Satoshi — keep only if needed as monospace fallback)

---

## Implementation Order (Critical Path)

```
Phase 0: npm install + download Satoshi fonts
    |
Phase 1: lib/theme.ts -> Colors.ts -> _layout.tsx -> +html.tsx -> constants.ts -> app.json
    |
Phase 2: All 16 ui/ components (parallel — no inter-dependencies)
    |
Phase 3: (tabs)/_layout.tsx navigation restructure
    |
Phase 4 (parallel tracks):
    |-- Track A: Auth (sign-in, sign-up)
    |-- Track B: Onboarding (interests, sub-interests, CategoryCard, SubcategoryChip)
    |-- Track C: Map (MapPin, LabelPin, CTAToggle, MapView)
    |-- Track D: Explore (SearchBar, CategoryStrip, TopBar, DiscoverCard, DetailPanel, CardFeed, DesktopLayout, MobileLayout)
    |-- Track E: Social (all 6 components + social.tsx + chat/[id] + friends/search)
    |-- Track F: Quests (QuestCard + quests.tsx + quest/[id])
    |-- Track G: Profile (profile.tsx + edit-profile + edit-preferences)
    |-- Track H: Collections (collections.tsx + SaveButton)
    |-- Track I: Spot detail (spot/[id])
    |
Phase 5: Cleanup + delete unused files
```

---

## File Count Summary

| Operation | Count |
|-----------|-------|
| Files to **create** | 20 (16 components + 4 font files) |
| Files to **modify** | ~43 |
| Files to **delete** | 2-3 |

---

## Verification

1. **Visual check**: `npx expo start --web` — navigate every route, verify no hardcoded old colors remain
2. **Type check**: `npx tsc --noEmit` — ensure no TypeScript errors
3. **Font loading**: Verify Satoshi renders on web and native (check `_layout.tsx` useFonts)
4. **Navigation**: Confirm 4 tabs show, FAB appears on Explore, collections accessible from Profile
5. **Map pins**: Verify Lucide icon badges render at various zoom levels
6. **Search bar**: Desktop = above feed only; Mobile = top of screen
7. **Grep audit**: `grep -r "#6C63FF\|#1a1a2e\|#222222\|#333\b" demonhacks/` — should return zero matches in styled components
8. **Component imports**: Verify all screens import from `@/lib/theme` and `@/components/ui/`

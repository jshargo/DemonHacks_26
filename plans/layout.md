# Plan: Airbnb-Style Discover Page Redesign

## Context

The current `app/(tabs)/index.tsx` is a simple fullscreen Mapbox map with a CategoryChips overlay (52 lines). The user wants to transform this into an Airbnb-style split-view discover experience — scrollable card feed alongside an interactive map with full bidirectional interaction. This is a major UI overhaul for DemonHacks '26: a Chicago event/venue/landmark discovery app.

The spec is documented at `.claude/skills/prep/SPEC.md`.

---

## Build Sequence (9 Milestones)

### M1: Foundation — Types, Mock Data, Store, Hooks

**Files to create/modify:**

1. **`lib/types.ts`** (modify) — Add 4 new types at the bottom:
   - `DiscoverItem` — enriched feed item (extends MapPin concept with neighborhood, rating, priceRange, tags, startsAt, endsAt, venueName, attendingCount)
   - `PinLabel` — `{ text: string; type: 'date' | 'price' | 'rating' }` for map pill pins
   - `MapBounds` — `{ north, south, east, west }` for viewport filtering
   - `DiscoverCategory` — `'all' | 'food_drink' | 'outdoors' | 'events' | 'shopping' | 'volunteering'`

2. **`lib/mock-data.ts`** (new) — ~20 realistic Chicago items as `DiscoverItem[]`:
   - 7 restaurants (Portillo's, Lou Malnati's, Girl & The Goat, Alinea, Big Star, Frontera Grill, Pequod's)
   - 6 events (Lollapalooza, Jazz Fest, Second City, Architecture Tour, Taste of Chicago, Blues Fest)
   - 5 landmarks (Cloud Gate, Art Institute, Willis Tower, Navy Pier, Wrigley Field)
   - 3 activities (Kayaking, 606 Trail, Lincoln Park Zoo)
   - Export `getPinLabel(item: DiscoverItem): PinLabel` — events→date, food→price, others→rating

3. **`stores/explore-store.ts`** (new) — Zustand store following existing pattern (`map-store.ts`):
   - State: `searchQuery`, `activeCategory`, `mapBounds`, `searchAsIMove` (default true), `hoveredItemId`, `hoveredPinId`, `detailItem`
   - Actions: setters for each + `openDetail(item)` / `closeDetail()`

4. **`hooks/useDiscoverFeed.ts`** (new) — Returns `{ items: DiscoverItem[], count: number }`:
   - Filters mock data by: activeCategory, searchQuery (name/desc/neighborhood/tags), mapBounds (when searchAsIMove is on)
   - All filtering via `useMemo` keyed on store state

5. **`hooks/useResponsive.ts`** (new) — Returns `{ isDesktop: boolean, width, height }`:
   - Uses `useWindowDimensions()` from react-native
   - Desktop: width >= 768

### M2: Card Component + Feed

6. **`components/explore/DiscoverCard.tsx`** (new) — Airbnb-style card:
   - Gray 3:2 image placeholder with `borderRadius: 12`
   - Category badge (colored pill, top-left of image) — color from `PLACE_CATEGORIES` or `ENTITY_TYPES`
   - SaveButton (top-right of image) — wired to `collection-store` Favorites
   - Title + rating row
   - Subtitle: `subcategory · neighborhood`
   - Conditional: events show formatted date, restaurants show price range
   - Optional tags as small pills
   - Hover handlers (`onHoverIn`/`onHoverOut` on `Pressable`) for desktop pin highlighting
   - Highlight pulse border when `isHighlighted` (from pin click)
   - Props: `item: DiscoverItem`, `onPress`, `onHover`, `onHoverEnd`, `isHighlighted`, `isSaved`, `onToggleSave`

7. **`components/explore/CardFeed.tsx`** (new) — FlatList of DiscoverCards:
   - Results counter header: "X things to do in this area"
   - "Search as I move the map" toggle
   - 2-column grid on desktop (via `numColumns={2}` or manual column layout), 1-column on mobile
   - Ref for `scrollToIndex` (pin click → scroll to card)
   - Reads `hoveredPinId` from explore-store for card highlighting

### M3: Top Bar (Search + Category Strip)

8. **`components/explore/SearchBar.tsx`** (new) — Centered search pill:
   - Text input styled as Airbnb pill (rounded, subtle shadow)
   - Connected to `explore-store.searchQuery`
   - Debounced 200ms input
   - Basic geocoding: if query matches a known neighborhood name, pan map via `mapRef.flyTo`

9. **`components/explore/CategoryStrip.tsx`** (new) — Horizontal icon+label category bar:
   - Categories: All, Food & Drink, Outdoors, Events, Shopping, Volunteering
   - Each item: icon (emoji) + label text
   - Active state: underline + bold
   - Connected to `explore-store.activeCategory`
   - Horizontal `ScrollView` with `showsHorizontalScrollIndicator={false}`

10. **`components/explore/TopBar.tsx`** (new) — Combines SearchBar + CategoryStrip:
    - Renders as column: SearchBar on top, CategoryStrip below
    - White background, bottom border, padding

### M4: Label Pins on Map

11. **`components/map/LabelPin.tsx`** (new) — Airbnb-style pill pin:
    - Raw HTML `<div>` (like AnimatedPin) since it lives inside Mapbox Marker overlay
    - White pill, rounded, shadow, dark bold text
    - Selected state: dark background, white text
    - Highlighted state: scale(1.15) + border ring
    - CSS transition for smooth state changes
    - Props: `pin`, `label`, `isSelected`, `isHighlighted`, `onClick`, `onMouseEnter`, `onMouseLeave`

12. **`components/map/MapView.tsx`** (modify — ~35 lines added):
    - Add optional props: `pinStyle?: 'animated' | 'label'`, `pinLabels?: Map<string, PinLabel>`, `highlightedPinId?: string`, `selectedPinId?: string`, `onPinHover?`, `onPinHoverEnd?`, `onBoundsChange?`
    - Conditional pin rendering: when `pinStyle='label'`, render `LabelPin` instead of `AnimatedPin`
    - In `handleMove`: compute and report bounds via `onBoundsChange` using `map.getBounds()`
    - All new props are optional — existing behavior unchanged when omitted

### M5: Desktop Layout

13. **`components/explore/DesktopLayout.tsx`** (new) — 50/50 split:
    - `flexDirection: 'row'`, left panel `flex: 1`, right panel `flex: 1`
    - Left panel: TopBar + (CardFeed OR DetailPanel based on `detailItem`)
    - Right panel: MapView with `pinStyle='label'`, all interaction callbacks wired
    - Debounced `onBoundsChange` handler (300ms) → `explore-store.setMapBounds`
    - Bidirectional wiring: `hoveredItemId` → `highlightedPinId`, pin click → `setHoveredPinId` + scroll

### M6: Detail Panel

14. **`components/explore/DetailPanel.tsx`** (new) — Full detail view:
    - Back button ("← Back to results") at top
    - Large gray image placeholder
    - Category badge + Save button
    - Title, rating, subtitle (subcategory · neighborhood)
    - Price range, description, tags
    - Event-specific: date/time, venue, attending count
    - Action buttons: "Get Directions", "Website" (if available)
    - On desktop: replaces CardFeed in left panel
    - On mobile: renders inside bottom sheet at full snap

### M7: Mobile Layout + Bottom Sheet

15. **`app/_layout.tsx`** (modify) — Wrap Stack with `GestureHandlerRootView`:
    ```
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider ...>
        <Stack>...</Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
    ```

16. **`components/explore/MobileLayout.tsx`** (new) — Map + bottom sheet:
    - Fullscreen MapView as background
    - TopBar overlaid at top (absolute positioned)
    - `@gorhom/bottom-sheet` with snap points: `['12%', '50%', '90%']`
    - Bottom sheet content: CardFeed or DetailPanel (conditional on `detailItem`)
    - When detail opens: snap to 90%. When back: snap to 50%.
    - `BottomSheetScrollView` for scrollable content inside sheet

### M8: Screen Integration

17. **`app/(tabs)/index.tsx`** (rewrite) — Responsive entry point:
    - Uses `useResponsive()` to detect desktop vs mobile
    - Renders `DesktopLayout` or `MobileLayout`
    - ~25 lines total

### M9: Polish

18. Wire SaveButton to collection-store Favorites (in DiscoverCard + DetailPanel)
19. Pin selected state (dark inverted) when detail is open
20. `flyTo` animation when opening detail
21. Highlight pulse CSS animation on card when pin is clicked
22. Category strip icons (emoji: 🍽 🌳 🎫 🛍 🤝)

---

## Key Architecture Decisions

### Existing Files Reused (not recreated)
- `components/map/MapView.tsx` — composed, not rewritten. 6 optional props added.
- `components/map/AnimatedPin.tsx` — pattern reference for LabelPin. Still used when `pinStyle='animated'`.
- `components/collections/SaveButton.tsx` — used directly in cards + detail panel
- `stores/map-store.ts` — still owns viewport, filters, selectedPin, 3D, lighting
- `stores/collection-store.ts` — used for save/unsave via `isSaved` + `addItem`/`removeItem`
- `lib/constants.ts` — `PLACE_CATEGORIES`, `ENTITY_TYPES`, `CHICAGO_CENTER`, `DEFAULT_VIEWPORT`

### Store Ownership
- **map-store**: viewport, selectedPin, 3D mode, light preset, CTA state, neighborhood hover
- **explore-store** (new): search query, category filter, map bounds, search-as-I-move toggle, hovered card/pin IDs, detail item
- Coordination: `openDetail()` in explore-store also calls `map-store.selectPin()` with a derived MapPin

### Why Not Modify CategoryChips?
CategoryChips is used on other screens and follows a different multi-select toggle pattern (Set-based). The new CategoryStrip is single-select (one active category) with a different visual treatment (underline vs filled chip). Cleaner to create new.

---

## New Files Summary

| File | Type | Lines (est.) |
|------|------|-------------|
| `lib/mock-data.ts` | Data | ~200 |
| `stores/explore-store.ts` | Store | ~60 |
| `hooks/useDiscoverFeed.ts` | Hook | ~50 |
| `hooks/useResponsive.ts` | Hook | ~15 |
| `components/explore/DiscoverCard.tsx` | Component | ~150 |
| `components/explore/CardFeed.tsx` | Component | ~120 |
| `components/explore/SearchBar.tsx` | Component | ~80 |
| `components/explore/CategoryStrip.tsx` | Component | ~100 |
| `components/explore/TopBar.tsx` | Component | ~40 |
| `components/explore/DetailPanel.tsx` | Component | ~180 |
| `components/explore/DesktopLayout.tsx` | Component | ~130 |
| `components/explore/MobileLayout.tsx` | Component | ~120 |
| `components/map/LabelPin.tsx` | Component | ~80 |

**Modified files:** `lib/types.ts` (+25), `components/map/MapView.tsx` (+35), `app/_layout.tsx` (+5), `app/(tabs)/index.tsx` (rewrite ~25)

**Total:** ~13 new files, 4 modified files

---

## Verification

1. **Desktop**: Resize browser to ≥768px → should see 50/50 split with card feed left, map right
2. **Mobile**: Resize browser to <768px → should see fullscreen map with bottom sheet
3. **Category filter**: Click a category → both feed cards and map pins filter
4. **Search**: Type "pizza" → only pizza-related items show
5. **Viewport filtering**: Pan the map → card feed updates to show only visible items
6. **Card hover** (desktop): Hover a card → corresponding map pin scales up
7. **Pin click**: Click a map pin → card feed scrolls to that card with highlight pulse
8. **Detail view**: Click a card → left panel shows detail, map flies to pin
9. **Back button**: Click back → returns to card feed
10. **Save button**: Click heart → toggles saved state (requires auth)
11. **Bottom sheet** (mobile): Swipe up → shows cards. Swipe to full → scrollable feed
12. **CTA overlays**: Toggle CTA buttons on map → transit layers still work
13. **3D mode**: Toggle 3D → map tilts, fog appears, all still functional
14. Run `cd demonhacks && npx tsc --noEmit` to verify no type errors
15. Run `cd demonhacks && npx expo start --web` to verify it renders

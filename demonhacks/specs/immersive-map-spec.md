# Immersive 3D Chicago Map — Feature Spec

## Overview
Transform the MapView from a basic 2D street map into an immersive, "alive" 3D experience that showcases Chicago with maximum visual impact. The map is the hero of the app — it should feel like a living, breathing window into the city.

## Aesthetic Direction
- **Tone**: Bright & playful — energetic, youthful, colorful
- **Both ambient motion AND interactive richness** — the map breathes on its own AND responds satisfyingly to user actions
- **No purple/blue AI aesthetic** — use the existing entity colors (orange/purple/teal) only for their functional purpose

## Feature Requirements

### 1. Mapbox Standard Style
- Migrate from `streets-v12` to `mapbox://styles/mapbox/standard`
- Hide default POI labels (`showPointOfInterestLabels: false`) — our pins replace them
- Keep place, road, and transit labels visible
- Unlocks built-in 3D buildings with window details and architectural distinctions

### 2. Real-time Sky & Lighting
- Map atmosphere reflects actual Chicago time (Central Time, `America/Chicago`)
- Uses Mapbox Standard light presets: `dawn` (5-7am), `day` (7am-5pm), `dusk` (5-8pm), `night` (8pm-5am)
- Transitions checked every 5 minutes via polling interval
- On transition: smoothly update light preset + fog configuration

### 3. 2D/3D Mode Toggle
- **2D (bird's eye)**: pitch 0, bearing 0, NO atmosphere/fog — clean, flat, utility mode
- **3D (tilted)**: pitch 60, bearing -17.6, full atmosphere/fog/sky/lighting — immersive showcase mode
- 800ms `easeTo()` animation between modes
- Toggle button: circular, bottom-right, inverts color when active

### 4. Atmosphere & Fog
- Active in 3D mode only
- Fog color tuned per light preset:
  - **Day**: light blue haze, no stars
  - **Dawn**: warm orange tones, faint stars
  - **Dusk**: deep amber, slight stars
  - **Night**: dark blue, prominent stars (0.8 intensity)
- Removed entirely in 2D mode (`setFog(null)`)

### 5. Animated Category Pins
- **Design**: 36px colored circles with 2.5px white border + drop shadow
- **Icons**: Inline SVGs per category (24x24 viewBox):
  - Restaurant: fork/utensils
  - Event: calendar
  - Activity: star
- **Entrance animation**: CSS `@keyframes pin-drop-bounce`
  - Starts 80px above final position, scaled to 0.6x, opacity 0
  - Bounces once, settles into position
  - Duration: 500ms, cubic-bezier(0.34, 1.56, 0.64, 1)
  - Staggered delay: 30ms per pin, capped at 600ms
- **No continuous animation** — entrance only for performance
- Uses only `transform` + `opacity` (hardware-accelerated)

### 6. Neighborhood Overlay
- ~15-20 major Chicago neighborhoods as simplified GeoJSON polygons
- **Invisible by default** — no fill, no border, no label
- **On hover/tap**: tinted color fill (20% opacity), colored border (2.5px), name label appears
- Implemented via Mapbox `feature-state` with `hover` boolean
- Touch devices: tap to highlight, tap elsewhere to dismiss
- Each neighborhood has a distinct tint color

#### Neighborhoods to include:
The Loop, River North, Wicker Park, Lincoln Park, Logan Square, Lakeview, Hyde Park, Pilsen, Chinatown, Old Town, Gold Coast, Bucktown, Wrigleyville, South Loop, West Loop, Streeterville, Bronzeville, Uptown

### 7. Water Enhancement
- Mapbox Standard already renders water dramatically with light-preset-aware coloring
- Fog configs use blue-tinted colors that complement Lake Michigan
- Default 3D bearing (-17.6) orients camera toward the lake as backdrop
- No custom water layer needed — Standard style handles it

### 8. Auto-rotate on Idle
- **3D mode only**
- After 10 seconds of no user interaction, camera slowly rotates
- Speed: ~3 degrees/second (full rotation in ~2 minutes)
- Frame-rate independent via `requestAnimationFrame` + `performance.now()` delta
- Stops immediately on any input (mousemove, mousedown, touchstart, wheel, keydown)
- Uses `map.setBearing()` for frame-by-frame control (not `easeTo`)

### 9. Compass Widget
- `NavigationControl` from react-map-gl
- Visible in 3D mode only
- Position: bottom-left (opposite the 3D toggle on bottom-right)
- Shows compass rose, visualizes pitch tilt
- Zoom buttons hidden (users zoom via scroll/pinch)
- Click compass to reset bearing to north

## Non-Goals
- Native mobile map (web only for hackathon)
- Custom water animation layers
- Continuous pin animations (breathing, pulsing)
- Full 77 community areas (simplified to ~18 major ones)
- Terrain elevation (flat Chicago doesn't benefit)

## Technical Constraints
- react-map-gl v8.1.0 + mapbox-gl v3.19.0
- Expo SDK 55 + React Native Web
- TypeScript strict mode
- Zustand for state management
- Chicago-only scope (bounds-locked)

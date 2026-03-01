# Bulk Seed Chicago Places from Google Places API

## Context

The Supabase `places` table currently holds ~30 hand-seeded venues. The app's feed is now powered entirely by Supabase (Phase 4 of the Supabase-First migration is complete), so the feed is only as good as the data in the table. The user wants to populate `places` with ALL locations Google provides within the Chicago city limits bounding box, including images.

---

## Strategy: Grid-Based Nearby Search

Google Places API (New) `searchNearby` returns up to 20 results per call with no pagination. To get comprehensive coverage of Chicago, we **grid the bounding box** into overlapping circular search cells and query each cell with multiple place type groups.

**Chicago bounds** (from `constants.ts`):
- SW: `[-87.945, 41.640]` (lng, lat)
- NE: `[-87.500, 42.030]` (lng, lat)
- Approx dimensions: ~37 km wide × ~43 km tall

**Grid parameters**:
- Search radius: **2000m** per cell
- Step between cells: **3000m** (creates 33% overlap to catch places near edges)
- Grid: ~13 columns × 15 rows = **~195 cells**

**Type groups** (3 searches per cell → ~585 API calls total):
1. `food_drink`: `restaurant, cafe, bar, bakery, coffee_shop, fast_food_restaurant, ice_cream_shop, meal_takeaway`
2. `outdoors + other`: `park, hiking_area, playground, garden, zoo, aquarium, museum, art_gallery, movie_theater, tourist_attraction, gym, spa, library, night_club, bowling_alley, stadium`
3. `shopping`: `shopping_mall, clothing_store, book_store, grocery_store, convenience_store, jewelry_store, home_goods_store, department_store, liquor_store`

**Expected yield**: ~3,000–8,000 unique places after dedup.

---

## Prerequisites

1. **Copy Google API key** to `backend/.env`:
   - The key `AIzaSyCpCu0_KemragZ6ufoDVbnGlRECHC2J6Vc` is in `demonhacks/.env` (`EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`)
   - Set `GOOGLE_PLACES_API_KEY=AIzaSyCpCu0_KemragZ6ufoDVbnGlRECHC2J6Vc` in `backend/.env`

2. **Ensure API is enabled** in Google Cloud Console: "Places API (New)" must be enabled for the project

---

## Implementation: `backend/seed_places.py` (new file)

A standalone Python script (~200 lines). Reuses patterns from `backend/main.py`.

### Dependencies
Uses `httpx`, `python-dotenv` (already in `requirements.txt`). Add `asyncio` (stdlib). No new packages needed.

### Core logic

```
1. Load env vars (GOOGLE_PLACES_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
2. Generate grid: iterate lat/lng in 3km steps across Chicago bounds
3. For each grid cell × each type group:
   a. POST to places.googleapis.com/v1/places:searchNearby
   b. Request fields: id, displayName, location, types, formattedAddress,
      websiteUri, nationalPhoneNumber, photos
   c. Collect results, keyed by Google place_id for dedup
4. Map Google types → our category enum (food_drink | outdoors | shopping | other)
5. For each unique place, extract first photo resource name
6. Batch fetch photo media URLs (rate-limited to 5/sec)
7. Upsert to Supabase via POST /rest/v1/places with on_conflict=mapbox_id
   - Store Google place_id in `mapbox_id` column for dedup
   - Generate slug from name
   - Map fields: name, address, lat, lng, category, image_url, website_url, phone
8. Print summary: total found, unique after dedup, inserted/updated count
```

### Google type → category mapping

```python
TYPE_TO_CATEGORY = {
    # food_drink
    "restaurant": "food_drink", "cafe": "food_drink", "bar": "food_drink",
    "bakery": "food_drink", "coffee_shop": "food_drink",
    "fast_food_restaurant": "food_drink", "ice_cream_shop": "food_drink",
    "meal_takeaway": "food_drink", "meal_delivery": "food_drink",
    # outdoors
    "park": "outdoors", "hiking_area": "outdoors", "campground": "outdoors",
    "playground": "outdoors", "garden": "outdoors", "marina": "outdoors",
    "dog_park": "outdoors", "national_park": "outdoors",
    # shopping
    "shopping_mall": "shopping", "clothing_store": "shopping",
    "book_store": "shopping", "grocery_store": "shopping",
    "convenience_store": "shopping", "jewelry_store": "shopping",
    "home_goods_store": "shopping", "department_store": "shopping",
    "shoe_store": "shopping", "liquor_store": "shopping",
    # other (default fallback)
    "museum": "other", "art_gallery": "other", "movie_theater": "other",
    "tourist_attraction": "other", "gym": "other", "spa": "other",
    "library": "other", "night_club": "other", "bowling_alley": "other",
    "zoo": "other", "aquarium": "other", "stadium": "other",
    "amusement_park": "other", "church": "other", "community_center": "other",
}
```

### Photo fetching

Reuse the same pattern as `_fetch_google_photo()` in `main.py`:
- The Nearby Search response includes `photos[].name` (resource path)
- Fetch media URL: `GET /v1/{photo_name}/media?maxWidthPx=800&key=...`
- Follow redirect to get the actual CDN image URL
- Store in `image_url` column

### Supabase upsert

Same pattern as `materialize_place()` in `main.py`:
- Use service role key to bypass RLS
- `POST /rest/v1/places` with `Prefer: return=representation,resolution=merge-duplicates`
- `on_conflict=mapbox_id` for dedup
- Handle slug conflicts by appending a UUID suffix

### Rate limiting & progress

- **5 requests/second** (0.2s sleep between requests)
- **Progress logging**: print every 10 grid cells completed
- **Estimated runtime**: ~2 min for grid search + ~10-25 min for photo fetches = ~12-27 min total
- **Resume support**: script checks existing `mapbox_id` values in Supabase before starting photo fetch phase, skips places already with images

### Running the script

```bash
cd backend
source venv/bin/activate
python seed_places.py
```

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/.env` | Modify | Add `GOOGLE_PLACES_API_KEY` value |
| `backend/seed_places.py` | **New** | Standalone seeding script (~200 lines) |

---

## Verification

1. Run `python seed_places.py` — observe progress logs, no errors
2. Check Supabase dashboard → `places` table should have thousands of rows
3. Verify images: `SELECT count(*) FROM places WHERE image_url IS NOT NULL` should be > 80% of total
4. Start the app (`npx expo start --web`) → feed should show many places with images
5. Category filter should show results for all 5 categories
6. No places outside Chicago bounds should appear (all lat/lng within the bounding box)

---

## Cost Estimate

| API Call | Count | Unit Cost | Total |
|----------|-------|-----------|-------|
| Nearby Search (New) | ~585 | $0.032 | ~$19 |
| Place Photo media | ~5,000 | $0.007 | ~$35 |
| **Total** | | | **~$54** |

Note: Actual cost depends on how many unique places are found. Google provides $200/month free credit on the Places API.

"""
Seed Chicago places from OpenStreetMap Overpass API.

Fetches all named POIs within Chicago's bounding box, maps OSM tags to our
PlaceCategory schema, synthesizes descriptions from available metadata, and
upserts them into Supabase. Completely free — no API key required for data.

OSM provides: names, coordinates, addresses (~76%), cuisine (~31%),
opening hours (~21%), websites (~44%), phones (~32%).
OSM does NOT provide: images (use --photos-only to backfill via Google).

Usage:
    python seed_places.py              # Seed all places (no images)
    python seed_places.py --photos-only # Backfill images for up to 1000 places
    python seed_places.py --dry-run     # Preview without writing to DB

Data: © OpenStreetMap contributors (ODbL)
"""

import argparse
import asyncio
import hashlib
import os
import re
import sys
import time
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Chicago municipal boundary (OSM relation 122604)
# Using area filter instead of bbox restricts results to the actual city polygon,
# excluding suburbs like Evanston, Oak Park, Skokie, Cicero, etc.
CHICAGO_AREA_ID = 3600122604  # OSM relation 122604 + 3600000000

BATCH_SIZE = 200  # Supabase handles 200-row batches well
MAX_CONCURRENT_UPSERTS = 10  # Parallel batch limit

OVERPASS_QUERY = f"""
[out:json][timeout:300];
area({CHICAGO_AREA_ID})->.chicago;
(
  // Food & Drink
  nwr["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|ice_cream|biergarten"]["name"](area.chicago);
  nwr["shop"~"bakery|confectionery|coffee"]["name"](area.chicago);

  // Shopping
  nwr["shop"~"supermarket|convenience|clothes|shoes|books|department_store|mall|gift|jewelry|furniture|electronics|alcohol|wine|beverages"]["name"](area.chicago);

  // Outdoors
  nwr["leisure"~"park|garden|playground|nature_reserve|dog_park|swimming_pool"]["name"](area.chicago);
  nwr["tourism"~"zoo|aquarium|picnic_site"]["name"](area.chicago);

  // Entertainment
  nwr["amenity"~"theatre|cinema|nightclub|public_bath|internet_cafe"]["name"](area.chicago);
  nwr["leisure"~"bowling_alley|stadium|trampoline_park|water_park"]["name"](area.chicago);

  // Arts & Culture
  nwr["tourism"~"museum|gallery|attraction|viewpoint"]["name"](area.chicago);
  nwr["amenity"~"library|community_centre|arts_centre|public_bookcase"]["name"](area.chicago);
);
out center;
"""


# ─── Helpers (mirrored from main.py) ─────────────────────────────────────────

def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "place"


def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def _short_hash(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()[:8]


# ─── OSM tag → PlaceCategory mapping ────────────────────────────────────────

FOOD_AMENITIES = {
    "restaurant", "cafe", "bar", "pub", "fast_food",
    "food_court", "ice_cream", "biergarten",
}
FOOD_SHOPS = {"bakery", "confectionery", "coffee"}

OUTDOOR_LEISURE = {
    "park", "garden", "playground", "nature_reserve",
    "dog_park", "swimming_pool",
}
OUTDOOR_TOURISM = {"zoo", "aquarium", "picnic_site"}

SHOPPING_SHOPS = {
    "supermarket", "convenience", "clothes", "shoes", "books",
    "department_store", "mall", "gift", "jewelry", "furniture",
    "electronics", "alcohol", "wine", "beverages",
}

ENTERTAINMENT_AMENITIES = {"theatre", "cinema", "nightclub", "public_bath", "internet_cafe"}
ENTERTAINMENT_LEISURE = {"bowling_alley", "stadium", "trampoline_park", "water_park"}

ARTS_CULTURE_TOURISM = {"museum", "gallery", "attraction", "viewpoint"}
ARTS_CULTURE_AMENITIES = {"library", "community_centre", "arts_centre", "public_bookcase"}


def categorize(tags: dict) -> str:
    amenity = tags.get("amenity", "")
    shop = tags.get("shop", "")
    leisure = tags.get("leisure", "")
    tourism = tags.get("tourism", "")

    if amenity in FOOD_AMENITIES or shop in FOOD_SHOPS:
        return "food_drink"

    if leisure in OUTDOOR_LEISURE or tourism in OUTDOOR_TOURISM:
        return "outdoors"

    if shop in SHOPPING_SHOPS:
        return "shopping"

    # Catch-all for any other shop type not in our explicit list
    if shop:
        return "shopping"

    if amenity in ENTERTAINMENT_AMENITIES or leisure in ENTERTAINMENT_LEISURE:
        return "entertainment"

    if tourism in ARTS_CULTURE_TOURISM or amenity in ARTS_CULTURE_AMENITIES:
        return "arts_culture"

    return "other"


# ─── Description generation from OSM tags ───────────────────────────────────

# Human-readable labels for OSM amenity/shop/leisure/tourism values
_AMENITY_LABELS = {
    "restaurant": "Restaurant",
    "cafe": "Café",
    "bar": "Bar",
    "pub": "Pub",
    "fast_food": "Fast food",
    "food_court": "Food court",
    "ice_cream": "Ice cream shop",
    "biergarten": "Beer garden",
    "library": "Library",
    "theatre": "Theater",
    "cinema": "Movie theater",
    "nightclub": "Nightclub",
    "community_centre": "Community center",
    "arts_centre": "Arts center",
}

_SHOP_LABELS = {
    "bakery": "Bakery",
    "confectionery": "Confectionery",
    "coffee": "Coffee shop",
    "supermarket": "Supermarket",
    "convenience": "Convenience store",
    "clothes": "Clothing store",
    "shoes": "Shoe store",
    "books": "Bookstore",
    "department_store": "Department store",
    "mall": "Shopping mall",
    "gift": "Gift shop",
    "jewelry": "Jewelry store",
    "furniture": "Furniture store",
    "electronics": "Electronics store",
    "alcohol": "Liquor store",
    "wine": "Wine shop",
    "beverages": "Beverage store",
}

_LEISURE_LABELS = {
    "park": "Park",
    "garden": "Garden",
    "playground": "Playground",
    "nature_reserve": "Nature reserve",
    "dog_park": "Dog park",
    "swimming_pool": "Swimming pool",
    "bowling_alley": "Bowling alley",
    "stadium": "Stadium",
}

_TOURISM_LABELS = {
    "zoo": "Zoo",
    "aquarium": "Aquarium",
    "picnic_site": "Picnic area",
    "museum": "Museum",
    "gallery": "Art gallery",
    "attraction": "Attraction",
    "viewpoint": "Scenic viewpoint",
}


def _format_cuisine(raw: str) -> str:
    """Turn 'pizza;pasta' or 'mexican' into 'Pizza, pasta' or 'Mexican'."""
    items = [c.strip().replace("_", " ").capitalize() for c in raw.split(";") if c.strip()]
    return ", ".join(items[:3])  # Cap at 3 cuisine types


def build_description(tags: dict) -> Optional[str]:
    """Synthesize a description from OSM tags."""
    parts = []

    amenity = tags.get("amenity", "")
    shop = tags.get("shop", "")
    leisure = tags.get("leisure", "")
    tourism = tags.get("tourism", "")
    cuisine = tags.get("cuisine", "")

    # Type label (e.g., "Restaurant", "Park", "Museum")
    type_label = (
        _AMENITY_LABELS.get(amenity)
        or _SHOP_LABELS.get(shop)
        or _LEISURE_LABELS.get(leisure)
        or _TOURISM_LABELS.get(tourism)
    )

    if type_label:
        # Combine cuisine with type for food places
        if cuisine and amenity in FOOD_AMENITIES:
            formatted = _format_cuisine(cuisine)
            parts.append(f"{formatted} {type_label.lower()}")
        else:
            parts.append(type_label)

    # Brand info adds context (e.g., "Part of the Starbucks chain")
    brand = tags.get("brand", "")
    operator = tags.get("operator", "")
    if brand and brand.lower() != tags.get("name", "").lower():
        parts.append(f"Part of {brand}")
    elif operator and operator.lower() != tags.get("name", "").lower():
        parts.append(f"Operated by {operator}")

    # Notable features
    features = []
    if tags.get("outdoor_seating") == "yes":
        features.append("outdoor seating")
    if tags.get("takeaway") in ("yes", "only"):
        features.append("takeout available")
    if tags.get("delivery") == "yes":
        features.append("delivery available")
    if tags.get("wheelchair") == "yes":
        features.append("wheelchair accessible")
    if tags.get("internet_access") in ("wlan", "yes"):
        features.append("free Wi-Fi")
    if tags.get("drive_through") == "yes":
        features.append("drive-through")
    if features:
        parts.append(", ".join(features).capitalize())

    # Opening hours (compact)
    hours = tags.get("opening_hours", "")
    if hours and len(hours) < 80:
        parts.append(f"Hours: {hours}")

    if not parts:
        return None

    return ". ".join(parts) + "."


# ─── Build address from addr:* tags ─────────────────────────────────────────

def build_address(tags: dict) -> Optional[str]:
    housenumber = tags.get("addr:housenumber", "")
    street = tags.get("addr:street", "")

    parts = []
    if housenumber and street:
        parts.append(f"{housenumber} {street}")
    elif street:
        parts.append(street)

    city = tags.get("addr:city", "Chicago")  # Default to Chicago
    state = tags.get("addr:state", "IL")
    postcode = tags.get("addr:postcode", "")

    # Only produce an address if we have at least a street
    if not parts:
        return None

    parts.append(city)
    parts.append(state)
    if postcode:
        parts.append(postcode)

    return ", ".join(parts)


# ─── Extract image URL from Wikimedia Commons tag ───────────────────────────

def extract_image_url(tags: dict) -> Optional[str]:
    """Extract a usable image URL from OSM image/wikimedia tags."""
    # Direct image URL
    image = tags.get("image", "")
    if image and image.startswith("http"):
        return image

    # Wikimedia commons file reference → thumbnail URL
    commons = tags.get("wikimedia_commons", "")
    if commons and commons.startswith("File:"):
        filename = commons[5:].replace(" ", "_")
        # Use Wikimedia thumbnail API (no key needed)
        md5 = hashlib.md5(filename.encode()).hexdigest()
        return (
            f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
            f"{md5[0]}/{md5[:2]}/{filename}/800px-{filename}"
        )

    return None


# ─── Extract lat/lng from an OSM element ────────────────────────────────────

def extract_coords(element: dict) -> Optional[tuple[float, float]]:
    """Return (lat, lng) or None."""
    if element.get("type") == "node":
        lat = element.get("lat")
        lon = element.get("lon")
        if lat is not None and lon is not None:
            return (lat, lon)
    else:
        center = element.get("center")
        if center:
            return (center["lat"], center["lon"])
    return None


# ─── Parse OSM elements into place dicts ────────────────────────────────────

def parse_elements(elements: list[dict]) -> list[dict]:
    seen = set()
    places = []

    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue

        osm_key = f"osm:{el['type']}/{el['id']}"
        if osm_key in seen:
            continue
        seen.add(osm_key)

        coords = extract_coords(el)
        if not coords:
            continue

        lat, lng = coords
        category = categorize(tags)
        address = build_address(tags)
        description = build_description(tags)
        image_url = extract_image_url(tags)

        # Always append hash to slug for OSM data — guarantees uniqueness
        # across 16k+ places and avoids conflicts with hand-seeded data
        base_slug = _slugify(name)
        slug = f"{base_slug}-{_short_hash(osm_key)}"

        places.append({
            "name": name,
            "slug": slug,
            "category": category,
            "description": description,
            "address": address,
            "lat": lat,
            "lng": lng,
            "website_url": tags.get("website") or tags.get("contact:website"),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "image_url": image_url,
            "mapbox_id": osm_key,
            "is_featured": False,
        })

    return places


# ─── Overpass fetch ──────────────────────────────────────────────────────────

async def fetch_overpass(client: httpx.AsyncClient) -> list[dict]:
    """Fetch all Chicago POIs from the Overpass API."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Querying Overpass API (attempt {attempt + 1})...")
            resp = await client.post(
                OVERPASS_URL,
                data={"data": OVERPASS_QUERY},
                timeout=360.0,
            )
            if resp.status_code in (429, 503):
                wait = 2 ** (attempt + 1)
                print(f"  Rate limited ({resp.status_code}), waiting {wait}s...")
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            elements = data.get("elements", [])
            print(f"  Received {len(elements)} raw elements")
            return elements
        except httpx.HTTPError as e:
            if attempt < max_retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"  Error: {e}, retrying in {wait}s...")
                await asyncio.sleep(wait)
            else:
                raise
    return []


# ─── Parallel Supabase upsert ───────────────────────────────────────────────

_upsert_progress = {"done": 0, "total": 0, "failed": 0}


async def upsert_batch(
    client: httpx.AsyncClient,
    sem: asyncio.Semaphore,
    batch: list[dict],
    batch_num: int,
) -> int:
    """Upsert a single batch under the semaphore. Returns upserted count."""
    async with sem:
        headers = {
            **_supabase_headers(),
            "Prefer": "resolution=merge-duplicates",
        }

        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/places",
            json=batch,
            headers=headers,
            params={"on_conflict": "mapbox_id"},
            timeout=30.0,
        )

        _upsert_progress["done"] += 1
        done = _upsert_progress["done"]
        total = _upsert_progress["total"]

        if resp.status_code in (200, 201):
            print(f"  [{done}/{total}] Batch {batch_num}: {len(batch)} rows OK")
            return len(batch)

        # On failure, try row-by-row to isolate bad rows
        print(f"  [{done}/{total}] Batch {batch_num} failed ({resp.status_code}: {resp.text[:120]}), falling back to row-by-row...")
        upserted = 0
        for p in batch:
            row_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/places",
                json=p,
                headers=headers,
                params={"on_conflict": "mapbox_id"},
                timeout=10.0,
            )
            if row_resp.status_code in (200, 201):
                upserted += 1
            else:
                _upsert_progress["failed"] += 1
        print(f"  [{done}/{total}] Batch {batch_num}: {upserted}/{len(batch)} rows (row-by-row)")
        return upserted


async def parallel_upsert(client: httpx.AsyncClient, places: list[dict]) -> int:
    """Upsert all places in parallel batches. Returns total upserted count."""
    batches = [places[i : i + BATCH_SIZE] for i in range(0, len(places), BATCH_SIZE)]
    _upsert_progress["done"] = 0
    _upsert_progress["total"] = len(batches)
    _upsert_progress["failed"] = 0

    sem = asyncio.Semaphore(MAX_CONCURRENT_UPSERTS)

    tasks = [
        upsert_batch(client, sem, batch, i + 1)
        for i, batch in enumerate(batches)
    ]

    results = await asyncio.gather(*tasks)
    total = sum(results)

    if _upsert_progress["failed"] > 0:
        print(f"\n  {_upsert_progress['failed']} individual rows failed to upsert")

    return total


# ─── Photo backfill ─────────────────────────────────────────────────────────

async def fetch_google_photo(
    client: httpx.AsyncClient, name: str, address: Optional[str] = None
) -> Optional[str]:
    """Fetch a photo URL from Google Places (mirrors main.py pattern)."""
    if not GOOGLE_PLACES_API_KEY:
        return None

    search_text = f"{name}, Chicago, IL"
    if address:
        search_text = f"{name}, {address}"

    try:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json={"textQuery": search_text, "maxResultCount": 1},
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": "places.photos",
            },
        )
        resp.raise_for_status()
        data = resp.json()

        places_data = data.get("places", [])
        if not places_data:
            return None

        photos = places_data[0].get("photos", [])
        if not photos:
            return None

        photo_name = photos[0].get("name")
        if not photo_name:
            return None

        media_resp = await client.get(
            f"https://places.googleapis.com/v1/{photo_name}/media",
            params={"maxWidthPx": "800", "key": GOOGLE_PLACES_API_KEY},
            follow_redirects=False,
        )
        if media_resp.status_code in (301, 302):
            return media_resp.headers.get("location")
        return None
    except Exception as e:
        print(f"  Photo error for '{name}': {e}")
        return None


async def backfill_photos(client: httpx.AsyncClient, limit: int = 1000) -> None:
    """Fetch images for places missing them, prioritizing food_drink."""
    headers = _supabase_headers()

    resp = await client.get(
        f"{SUPABASE_URL}/rest/v1/places",
        params={
            "select": "id,name,address,category",
            "image_url": "is.null",
            "order": "category.asc",  # food_drink sorts first alphabetically
            "limit": str(limit),
        },
        headers=headers,
    )

    if resp.status_code != 200:
        print(f"Failed to fetch places for photo backfill: {resp.status_code}")
        return

    places_data = resp.json()
    print(f"Found {len(places_data)} places without images")

    updated = 0
    skipped = 0

    for i, place in enumerate(places_data):
        image_url = await fetch_google_photo(client, place["name"], place.get("address"))

        if image_url:
            patch_resp = await client.patch(
                f"{SUPABASE_URL}/rest/v1/places",
                params={"id": f"eq.{place['id']}"},
                json={"image_url": image_url},
                headers=headers,
            )
            if patch_resp.status_code in (200, 204):
                updated += 1
            else:
                skipped += 1
        else:
            skipped += 1

        if (i + 1) % 50 == 0:
            print(f"  Progress: {i + 1}/{len(places_data)} ({updated} photos found)")

        # Respect Google rate limits: ~5 req/sec
        await asyncio.sleep(0.2)

    print(f"\nPhoto backfill complete: {updated} updated, {skipped} no photo found")


# ─── Main ────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Seed Chicago places from OSM")
    parser.add_argument("--photos-only", action="store_true",
                        help="Only backfill photos for existing places")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview data without writing to Supabase")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    async with httpx.AsyncClient(timeout=30.0) as client:
        if args.photos_only:
            if not GOOGLE_PLACES_API_KEY:
                print("Error: GOOGLE_PLACES_API_KEY required for --photos-only")
                sys.exit(1)
            print("=== Photo Backfill Mode ===\n")
            await backfill_photos(client)
            return

        # Phase 1: Fetch from Overpass
        print("=== Seeding Chicago Places from OpenStreetMap ===\n")
        start = time.time()
        elements = await fetch_overpass(client)
        fetch_time = time.time() - start
        print(f"  Fetch completed in {fetch_time:.1f}s\n")

        if not elements:
            print("No elements returned from Overpass. Exiting.")
            sys.exit(1)

        # Phase 2: Parse, categorize, and generate descriptions
        print("Parsing and categorizing...")
        places = parse_elements(elements)
        print(f"  {len(places)} unique named places extracted\n")

        # Stats
        cat_counts: dict[str, int] = {}
        has_desc = 0
        has_addr = 0
        has_img = 0
        for p in places:
            cat_counts[p["category"]] = cat_counts.get(p["category"], 0) + 1
            if p["description"]:
                has_desc += 1
            if p["address"]:
                has_addr += 1
            if p["image_url"]:
                has_img += 1

        print("Category breakdown:")
        for cat, count in sorted(cat_counts.items()):
            print(f"  {cat}: {count}")
        print(f"\nData coverage:")
        print(f"  Descriptions: {has_desc}/{len(places)} ({100 * has_desc / len(places):.0f}%)")
        print(f"  Addresses:    {has_addr}/{len(places)} ({100 * has_addr / len(places):.0f}%)")
        print(f"  Images (OSM): {has_img}/{len(places)} ({100 * has_img / len(places):.0f}%)")
        print()

        if args.dry_run:
            print("[DRY RUN] Would upsert the above places. No DB writes.\n")
            print("Sample places (first 10):")
            for p in places[:10]:
                desc_preview = (p["description"] or "—")[:80]
                addr_preview = (p["address"] or "—")[:50]
                print(f"  {p['name']} [{p['category']}]")
                print(f"    {p['lat']:.4f}, {p['lng']:.4f} | {addr_preview}")
                print(f"    {desc_preview}")
            return

        # Phase 3: Parallel upsert to Supabase
        print(f"Upserting to Supabase ({len(places)} places, "
              f"{BATCH_SIZE}/batch, {MAX_CONCURRENT_UPSERTS} concurrent)...")
        total_upserted = await parallel_upsert(client, places)

        elapsed = time.time() - start
        print(f"\n=== Done ===")
        print(f"Total fetched:  {len(elements)}")
        print(f"Unique places:  {len(places)}")
        print(f"Upserted to DB: {total_upserted}")
        print(f"Time elapsed:   {elapsed:.1f}s")
        print(f"\nData: © OpenStreetMap contributors (ODbL)")
        print(f"\nTo backfill images: python seed_places.py --photos-only")


if __name__ == "__main__":
    asyncio.run(main())

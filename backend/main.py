"""
Chicago Event Discovery Map — API Backend

Centralizes external API calls (CTA Train Tracker, Google Places, etc.)
behind a single FastAPI server with proper CORS headers. Keeps API keys
server-side and provides place materialization for the Supabase-first feed.

Run:  cd backend && uvicorn main:app --reload --port 8000
"""

import os
import re
import time
import uuid
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

CTA_API_KEY = os.getenv("CTA_API_KEY", "")
CTA_API_BASE = "https://lapi.transitchicago.com/api/1.0"
CTA_ALL_ROUTES = ["red", "blue", "brn", "g", "org", "p", "pink", "y"]

# Supabase (service role bypasses RLS for server-side upserts)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Google Places API (for fetching venue photos)
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

# Map CTA API @name (lowercase) to the route codes used by the frontend
_ROUTE_CODE_MAP = {
    "red": "Red",
    "blue": "Blue",
    "brn": "Brn",
    "g": "G",
    "org": "Org",
    "p": "P",
    "pink": "Pink",
    "y": "Y",
}


_ROUTE_NAME_MAP = {
    "red line": "Red",
    "blue line": "Blue",
    "brown line": "Brn",
    "green line": "G",
    "orange line": "Org",
    "purple line": "P",
    "pink line": "Pink",
    "yellow line": "Y",
}


def _normalize_route_code(name: str) -> str:
    key = name.lower().strip()
    return _ROUTE_CODE_MAP.get(key) or _ROUTE_NAME_MAP.get(key, name)

# ─── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="DemonHacks Chicago API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten for production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─── In-memory cache ────────────────────────────────────────────────────────────
# CTA API data updates ~every 30-60s. We cache for 10s to deduplicate
# requests from multiple browser tabs without serving stale data.

_cache: dict[str, tuple[float, object]] = {}
CACHE_TTL_SEC = 10


def get_cached(key: str) -> Optional[object]:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL_SEC:
        return entry[1]
    return None


def set_cached(key: str, value: object) -> None:
    _cache[key] = (time.time(), value)


# ─── HTTP client ────────────────────────────────────────────────────────────────

http_client = httpx.AsyncClient(timeout=10.0)


# ─── Models ─────────────────────────────────────────────────────────────────────

class Train(BaseModel):
    rn: str
    rt: str
    lat: float
    lon: float
    heading: int
    destNm: str
    nextStaNm: str
    isDly: bool
    isApp: bool
    prdt: str
    arrT: str


class TrainPositionsResponse(BaseModel):
    trains: list[Train]
    timestamp: str


class TrainStop(BaseModel):
    staNm: str
    stpDe: str
    arrT: str
    isApp: bool
    isDly: bool
    prdt: str


class TrainDetailResponse(BaseModel):
    rn: str
    rt: str
    destNm: str
    stops: list[TrainStop]


# ─── Place Materialization Models ──────────────────────────────────────────────

class MaterializeRequest(BaseModel):
    mapbox_id: str
    name: str
    address: Optional[str] = None
    lat: float
    lng: float
    category: str = "other"
    website: Optional[str] = None

class MaterializeResponse(BaseModel):
    place_id: str
    image_url: Optional[str] = None

class BatchPhotosRequest(BaseModel):
    place_ids: Optional[list[str]] = None

class BatchPhotosResponse(BaseModel):
    updated: int


# ─── Supabase helpers ─────────────────────────────────────────────────────────

def _supabase_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "place"


MATERIALIZE_CACHE_TTL = 3600  # 1 hour


# ─── Google Places photo helper ───────────────────────────────────────────────

async def _fetch_google_photo(name: str, address: Optional[str] = None) -> Optional[str]:
    """Search Google Places for a venue and return the first photo URL."""
    if not GOOGLE_PLACES_API_KEY:
        return None

    search_text = f"{name}, Chicago, IL"
    if address:
        search_text = f"{name}, {address}"

    try:
        resp = await http_client.post(
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

        places = data.get("places", [])
        if not places:
            return None

        photos = places[0].get("photos", [])
        if not photos:
            return None

        photo_name = photos[0].get("name")
        if not photo_name:
            return None

        # Fetch media URL
        media_resp = await http_client.get(
            f"https://places.googleapis.com/v1/{photo_name}/media",
            params={"maxWidthPx": "800", "key": GOOGLE_PLACES_API_KEY},
            follow_redirects=False,
        )
        # Google redirects to the actual image URL
        if media_resp.status_code in (301, 302):
            return media_resp.headers.get("location")
        return None
    except Exception as e:
        print(f"Google Places photo error for '{name}': {e}")
        return None


# ─── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "cta_key_set": bool(CTA_API_KEY)}


@app.get("/api/cta/trains", response_model=TrainPositionsResponse)
async def get_train_positions():
    """
    Fetch live positions of all CTA L trains across all 8 routes.
    Single upstream API call, cached for 10 seconds.
    """
    if not CTA_API_KEY:
        raise HTTPException(status_code=500, detail="CTA_API_KEY not configured")

    cached = get_cached("train_positions")
    if cached:
        return cached

    route_params = "&".join(f"rt={rt}" for rt in CTA_ALL_ROUTES)
    url = f"{CTA_API_BASE}/ttpositions.aspx?key={CTA_API_KEY}&{route_params}&outputType=JSON"

    try:
        resp = await http_client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"CTA API error: {e}")

    data = resp.json()
    root = data.get("ctatt", {})

    if root.get("errCd") != "0":
        raise HTTPException(
            status_code=502,
            detail=f"CTA API error: {root.get('errNm', 'Unknown')}",
        )

    trains: list[Train] = []
    routes = root.get("route", [])
    if not isinstance(routes, list):
        routes = [routes]

    for route in routes:
        # Route code is on the parent route object, not on each train
        route_code = _normalize_route_code(str(route.get("@name", "")))

        raw_trains = route.get("train", [])
        if not isinstance(raw_trains, list):
            raw_trains = [raw_trains]

        for t in raw_trains:
            trains.append(
                Train(
                    rn=str(t["rn"]),
                    rt=route_code,
                    lat=float(t["lat"]),
                    lon=float(t["lon"]),
                    heading=int(t["heading"]),
                    destNm=str(t["destNm"]),
                    nextStaNm=str(t["nextStaNm"]),
                    isDly=t.get("isDly") == "1",
                    isApp=t.get("isApp") == "1",
                    prdt=str(t.get("prdt", "")),
                    arrT=str(t.get("arrT", "")),
                )
            )

    result = TrainPositionsResponse(
        trains=trains,
        timestamp=root.get("tmst", ""),
    )

    set_cached("train_positions", result)
    return result


@app.get("/api/cta/trains/{run_number}", response_model=TrainDetailResponse)
async def get_train_detail(run_number: str):
    """
    Fetch upcoming station arrivals for a specific train run.
    Uses the CTA Follow This Train API.
    """
    if not CTA_API_KEY:
        raise HTTPException(status_code=500, detail="CTA_API_KEY not configured")

    cache_key = f"train_detail_{run_number}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    url = (
        f"{CTA_API_BASE}/ttfollow.aspx"
        f"?key={CTA_API_KEY}&runnumber={run_number}&outputType=JSON"
    )

    try:
        resp = await http_client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"CTA API error: {e}")

    data = resp.json()
    root = data.get("ctatt", {})

    if root.get("errCd") != "0":
        raise HTTPException(
            status_code=502,
            detail=f"CTA API error: {root.get('errNm', 'Unknown')}",
        )

    etas = root.get("eta", [])
    if not isinstance(etas, list):
        etas = [etas]

    if not etas:
        raise HTTPException(status_code=404, detail="No data for this run number")

    first = etas[0]
    result = TrainDetailResponse(
        rn=str(first["rn"]),
        rt=_normalize_route_code(str(first["rt"])),
        destNm=str(first["destNm"]),
        stops=[
            TrainStop(
                staNm=str(e["staNm"]),
                stpDe=str(e["stpDe"]),
                arrT=str(e["arrT"]),
                isApp=e.get("isApp") == "1",
                isDly=e.get("isDly") == "1",
                prdt=str(e.get("prdt", "")),
            )
            for e in etas
        ],
    )

    set_cached(cache_key, result)
    return result


# ─── Place Materialization Routes ──────────────────────────────────────────────

@app.post("/api/places/materialize", response_model=MaterializeResponse)
async def materialize_place(req: MaterializeRequest):
    """
    Upsert a Mapbox search result into the places table.
    If a place with the same mapbox_id exists, return it.
    Otherwise, insert a new row and optionally fetch a Google photo.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    cache_key = f"materialize_{req.mapbox_id}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    headers = _supabase_headers()

    # Check if place already exists by mapbox_id
    check_resp = await http_client.get(
        f"{SUPABASE_URL}/rest/v1/places",
        params={"mapbox_id": f"eq.{req.mapbox_id}", "select": "id,image_url"},
        headers=headers,
    )

    if check_resp.status_code == 200:
        existing = check_resp.json()
        if existing:
            row = existing[0]
            result = MaterializeResponse(
                place_id=row["id"],
                image_url=row.get("image_url"),
            )
            set_cached(cache_key, result)
            return result

    # Validate category
    valid_categories = {"food_drink", "outdoors", "shopping", "volunteering", "entertainment", "arts_culture", "other"}
    category = req.category if req.category in valid_categories else "other"

    # Fetch image from Google Places
    image_url = await _fetch_google_photo(req.name, req.address)

    slug = _slugify(req.name)
    place_id = str(uuid.uuid4())

    insert_data = {
        "id": place_id,
        "name": req.name,
        "slug": slug,
        "category": category,
        "lat": req.lat,
        "lng": req.lng,
        "address": req.address,
        "website_url": req.website,
        "mapbox_id": req.mapbox_id,
        "image_url": image_url,
    }

    # Upsert by mapbox_id to handle race conditions
    upsert_resp = await http_client.post(
        f"{SUPABASE_URL}/rest/v1/places",
        json=insert_data,
        headers={
            **headers,
            "Prefer": "return=representation,resolution=merge-duplicates",
        },
        params={"on_conflict": "mapbox_id"},
    )

    if upsert_resp.status_code not in (200, 201):
        # If slug conflict, add a suffix and retry
        if "slug" in upsert_resp.text:
            insert_data["slug"] = f"{slug}-{place_id[:8]}"
            upsert_resp = await http_client.post(
                f"{SUPABASE_URL}/rest/v1/places",
                json=insert_data,
                headers={
                    **headers,
                    "Prefer": "return=representation,resolution=merge-duplicates",
                },
                params={"on_conflict": "mapbox_id"},
            )

    if upsert_resp.status_code in (200, 201):
        rows = upsert_resp.json()
        if rows:
            row = rows[0] if isinstance(rows, list) else rows
            result = MaterializeResponse(
                place_id=row["id"],
                image_url=row.get("image_url"),
            )
            set_cached(cache_key, result)
            return result

    raise HTTPException(
        status_code=500,
        detail=f"Failed to upsert place: {upsert_resp.text}",
    )


@app.post("/api/places/batch-photos", response_model=BatchPhotosResponse)
async def batch_photos(req: BatchPhotosRequest):
    """
    Backfill images for places that have image_url = null.
    If place_ids provided, only update those; otherwise update all null-image places.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    headers = _supabase_headers()

    # Fetch places needing photos
    params: dict[str, str] = {
        "select": "id,name,address",
        "image_url": "is.null",
    }
    if req.place_ids:
        params["id"] = f"in.({','.join(req.place_ids)})"

    resp = await http_client.get(
        f"{SUPABASE_URL}/rest/v1/places",
        params=params,
        headers=headers,
    )

    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch places")

    places = resp.json()
    updated = 0

    for place in places:
        image_url = await _fetch_google_photo(place["name"], place.get("address"))
        if not image_url:
            continue

        patch_resp = await http_client.patch(
            f"{SUPABASE_URL}/rest/v1/places",
            params={"id": f"eq.{place['id']}"},
            json={"image_url": image_url},
            headers=headers,
        )
        if patch_resp.status_code in (200, 204):
            updated += 1

    return BatchPhotosResponse(updated=updated)

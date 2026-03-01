"""
Chicago Event Discovery Map — API Backend

Centralizes external API calls (CTA Train Tracker, etc.) behind a single
FastAPI server with proper CORS headers. Keeps API keys server-side.

Run:  cd backend && uvicorn main:app --reload --port 8000
"""

import os
import time
from datetime import datetime, timedelta, timezone
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

TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY", "")
TICKETMASTER_API_BASE = "https://app.ticketmaster.com/discovery/v2"
# Chicago center coordinates for geo-filtered event searches
CHICAGO_LAT = "41.8781"
CHICAGO_LON = "-87.6298"
EVENTS_CACHE_TTL_SEC = 300  # 5 minutes — events don't change often

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
    allow_methods=["GET"],
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


# ─── Ticketmaster Models ────────────────────────────────────────────────────

class TicketmasterEvent(BaseModel):
    id: str
    name: str
    url: str
    imageUrl: Optional[str] = None
    startDate: Optional[str] = None
    venueName: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    genre: Optional[str] = None
    subGenre: Optional[str] = None


class TicketmasterEventsResponse(BaseModel):
    events: list[TicketmasterEvent]


# ─── Ticketmaster Routes ────────────────────────────────────────────────────

@app.get("/api/ticketmaster/events", response_model=TicketmasterEventsResponse)
async def get_ticketmaster_events(
    keyword: Optional[str] = Query(None, description="Search keyword"),
    classificationName: Optional[str] = Query(None, description="e.g. Sports, Music, Arts"),
    size: int = Query(200, ge=1, le=200, description="Number of events to return"),
):
    """
    Fetch upcoming events near Chicago from the Ticketmaster Discovery API.
    Results are cached for 5 minutes.
    """
    if not TICKETMASTER_API_KEY:
        raise HTTPException(status_code=500, detail="TICKETMASTER_API_KEY not configured")

    # Build cache key from query params
    cache_key = f"tm_events_{keyword}_{classificationName}_{size}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    params: dict[str, str | int] = {
        "apikey": TICKETMASTER_API_KEY,
        "latlong": f"{CHICAGO_LAT},{CHICAGO_LON}",
        "radius": "30",
        "unit": "miles",
        "size": size,
        "sort": "date,asc",
        "startDateTime": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if keyword:
        params["keyword"] = keyword
    if classificationName:
        params["classificationName"] = classificationName

    url = f"{TICKETMASTER_API_BASE}/events.json"

    try:
        resp = await http_client.get(url, params=params)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ticketmaster API error: {e}")

    data = resp.json()
    raw_events = data.get("_embedded", {}).get("events", [])

    events: list[TicketmasterEvent] = []
    for ev in raw_events:
        # Extract venue location
        venues = ev.get("_embedded", {}).get("venues", [])
        venue = venues[0] if venues else {}
        location = venue.get("location", {})
        lat = float(location["latitude"]) if "latitude" in location else None
        lng = float(location["longitude"]) if "longitude" in location else None

        # Extract image (prefer 16:9 ratio)
        images = ev.get("images", [])
        image_url = None
        for img in images:
            if img.get("ratio") == "16_9" and img.get("width", 0) >= 640:
                image_url = img.get("url")
                break
        if not image_url and images:
            image_url = images[0].get("url")

        # Extract genre/subgenre
        classifications = ev.get("classifications", [])
        genre = None
        sub_genre = None
        if classifications:
            genre = classifications[0].get("genre", {}).get("name")
            sub_genre = classifications[0].get("subGenre", {}).get("name")

        # Extract start date
        dates = ev.get("dates", {}).get("start", {})
        start_date = dates.get("dateTime") or dates.get("localDate")

        events.append(
            TicketmasterEvent(
                id=ev["id"],
                name=ev.get("name", "Unknown Event"),
                url=ev.get("url", ""),
                imageUrl=image_url,
                startDate=start_date,
                venueName=venue.get("name"),
                lat=lat,
                lng=lng,
                genre=genre if genre != "Undefined" else None,
                subGenre=sub_genre if sub_genre != "Undefined" else None,
            )
        )

    result = TicketmasterEventsResponse(events=events)

    # Use longer TTL for events
    _cache[cache_key] = (time.time(), result)
    return result

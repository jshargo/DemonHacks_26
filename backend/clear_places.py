"""
Delete all OSM-seeded places from Supabase.

Only deletes places with mapbox_id starting with 'osm:' (seeded by seed_places.py).
Hand-seeded places (with different mapbox_id formats or NULL) are preserved.

Usage:
    python clear_places.py          # Delete all OSM-seeded places
    python clear_places.py --all    # Delete ALL places (including hand-seeded)
"""

import argparse
import asyncio
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def main():
    parser = argparse.ArgumentParser(description="Clear places from Supabase")
    parser.add_argument("--all", action="store_true",
                        help="Delete ALL places, not just OSM-seeded ones")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Count first
        count_params: dict[str, str] = {"select": "id"}
        if not args.all:
            count_params["mapbox_id"] = "like.osm:*"

        count_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/places",
            params=count_params,
            headers=headers(),
        )

        if count_resp.status_code != 200:
            print(f"Error counting places: {count_resp.status_code} {count_resp.text}")
            sys.exit(1)

        places = count_resp.json()
        count = len(places)
        label = "ALL" if args.all else "OSM-seeded"

        if count == 0:
            print(f"No {label} places found. Nothing to delete.")
            return

        print(f"Found {count} {label} places to delete.")

        # Delete
        delete_params: dict[str, str] = {}
        if args.all:
            # Need a filter that matches everything — id is never null
            delete_params["id"] = "not.is.null"
        else:
            delete_params["mapbox_id"] = "like.osm:*"

        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/places",
            params=delete_params,
            headers=headers(),
        )

        if resp.status_code in (200, 204):
            deleted = resp.json() if resp.text else []
            n = len(deleted) if isinstance(deleted, list) else count
            print(f"Deleted {n} {label} places.")
        else:
            print(f"Error deleting: {resp.status_code} {resp.text}")


if __name__ == "__main__":
    asyncio.run(main())

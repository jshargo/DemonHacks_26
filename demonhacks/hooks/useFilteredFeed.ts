// useFilteredFeed — applies dropdown filters + polygon spatial filters to
// the discover feed items. Reads from filter-store and draw-store.

import { useMemo } from 'react';
import { useFilterStore, type FilterCategory } from '@/stores/filter-store';
import { useDrawStore, type PolygonCoords } from '@/stores/draw-store';
import type { DiscoverItem } from '@/lib/types';

// ─── Point-in-polygon (ray-casting) ────────────────────────────────────────

/**
 * Test whether a point (lng, lat) lies inside a polygon.
 * Uses the ray-casting algorithm.
 * Polygon is an array of [lng, lat] pairs (NOT closed — first !== last).
 */
function pointInPolygon(lng: number, lat: number, polygon: PolygonCoords): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect =
            yi > lat !== yj > lat &&
            lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// ─── Category mapping ──────────────────────────────────────────────────────

/** Map a FilterCategory value to a DiscoverItem.category value or entityType */
function matchesCategory(item: DiscoverItem, cat: FilterCategory): boolean {
    if (cat === 'events') return item.entityType === 'event';
    return item.category === cat;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useFilteredFeed(items: DiscoverItem[]): {
    filteredItems: DiscoverItem[];
    filteredCount: number;
} {
    const selectedCategory = useFilterStore((s) => s.selectedCategory);
    const selectedNeighborhood = useFilterStore((s) => s.selectedNeighborhood);
    const selectedDistanceFrom = useFilterStore((s) => s.selectedDistanceFrom);
    const drawnPolygon = useDrawStore((s) => s.drawnPolygon);

    const filteredItems = useMemo(() => {
        let result = items;

        // 1. Category filter
        if (selectedCategory) {
            result = result.filter((item) => matchesCategory(item, selectedCategory));
        }

        // 2. Neighborhood filter
        if (selectedNeighborhood) {
            result = result.filter(
                (item) =>
                    item.neighborhood.toLowerCase() === selectedNeighborhood.toLowerCase(),
            );
        }

        // 3. Distance-from filter (informational tag — currently a no-op filter
        //    since mock data doesn't have proximity data, but the selection
        //    is persisted and displayed in the modal)

        // 4. Spatial filter: keep items inside the drawn polygon
        if (drawnPolygon && drawnPolygon.length >= 3) {
            result = result.filter((item) =>
                item.lat !== 0 && item.lng !== 0
                    ? pointInPolygon(item.lng, item.lat, drawnPolygon)
                    : false,
            );
        }

        return result;
    }, [items, selectedCategory, selectedNeighborhood, selectedDistanceFrom, drawnPolygon]);

    return { filteredItems, filteredCount: filteredItems.length };
}

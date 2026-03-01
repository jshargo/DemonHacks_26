// TicketmasterLayer — Ticketmaster event markers on the map.
// Groups events by venue, color-codes by segment/genre, and shows interactive popups
// with event images. Includes date and category filter controls.
//
// Ticketmaster classification hierarchy:
//   segment (Sports, Music, Arts & Theatre) → genre (Basketball, Rock) → subGenre (NBA, Pop)

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView, Image } from 'react-native';
import { Source, Layer, Popup, useMap } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { useCTAStore } from '@/stores/cta-store';
import { useTicketmasterEvents } from '@/hooks/useTicketmasterEvents';
import type { TicketmasterEvent } from '@/lib/ticketmaster';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VenueGroup {
    venueName: string;
    lat: number;
    lng: number;
    events: TicketmasterEvent[];
    /** Best category for coloring: segment or genre */
    category: string;
}

interface SelectedVenue {
    longitude: number;
    latitude: number;
    venue: VenueGroup;
}

// ─── Category Color Map ─────────────────────────────────────────────────────
// Uses segment-level categories first, then genre-level for specificity

const CATEGORY_COLORS: Record<string, string> = {
    // Segments (top-level)
    Sports: '#ff6b35',
    Music: '#7b2ff7',
    'Arts & Theatre': '#e91e8c',
    Miscellaneous: '#71717a',
    // Genres (more specific, override segment color when matched)
    Rock: '#ef233c',
    Pop: '#c77dff',
    Jazz: '#2ec4b6',
    Blues: '#2ec4b6',
    'Hip-Hop/Rap': '#ff9f1c',
    Alternative: '#06d6a0',
    Folk: '#8ecae6',
    Latin: '#fb5607',
    Family: '#00b4d8',
    Comedy: '#ffd60a',
    R_B: '#e76f51',
    Metal: '#3d405b',
};

const DEFAULT_COLOR = '#ff4d4d';

/** Get the display color for an event based on its segment + genre */
function categoryColor(segment: string | null, genre: string | null): string {
    // Try genre first for more specific color
    if (genre && CATEGORY_COLORS[genre]) return CATEGORY_COLORS[genre];
    // Fall back to segment
    if (segment && CATEGORY_COLORS[segment]) return CATEGORY_COLORS[segment];
    return DEFAULT_COLOR;
}

/** Get the best category label for an event */
function bestCategory(ev: TicketmasterEvent): string {
    return ev.segment ?? ev.genre ?? '';
}

// Filter chips use segment-level categories
const CATEGORY_CHIPS = [
    { key: 'Sports', emoji: '🏀', label: 'Sports' },
    { key: 'Music', emoji: '🎵', label: 'Music' },
    { key: 'Arts & Theatre', emoji: '🎭', label: 'Arts' },
    { key: 'Miscellaneous', emoji: '🎪', label: 'Other' },
];

// ─── Date Filter ────────────────────────────────────────────────────────────

interface DateRange { start: Date; end: Date; }

/** Returns a start/end range for each filter so counts are non-overlapping */
function getFilterRange(filter: 'today' | 'tomorrow' | 'week'): DateRange {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    if (filter === 'today') {
        return { start: now, end: endOfToday };
    } else if (filter === 'tomorrow') {
        const startTomorrow = new Date(startOfToday);
        startTomorrow.setDate(startTomorrow.getDate() + 1);
        const endTomorrow = new Date(startTomorrow);
        endTomorrow.setHours(23, 59, 59, 999);
        return { start: startTomorrow, end: endTomorrow };
    } else {
        // 'week' — from now through 7 days
        const endWeek = new Date(now);
        endWeek.setDate(endWeek.getDate() + 7);
        endWeek.setHours(23, 59, 59, 999);
        return { start: now, end: endWeek };
    }
}

const DATE_OPTIONS = [
    { key: 'today' as const, label: 'Today' },
    { key: 'tomorrow' as const, label: 'Tomorrow' },
    { key: 'week' as const, label: 'This Week' },
];

function coordKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TicketmasterLayer() {
    const showTicketmasterEvents = useCTAStore((s) => s.showTicketmasterEvents);
    const dateFilter = useCTAStore((s) => s.ticketmasterDateFilter);
    const setDateFilter = useCTAStore((s) => s.setTicketmasterDateFilter);
    const genreFilter = useCTAStore((s) => s.ticketmasterGenreFilter);
    const toggleGenre = useCTAStore((s) => s.toggleTicketmasterGenre);
    const { events } = useTicketmasterEvents();
    const { current: map } = useMap();
    const [selected, setSelected] = useState<SelectedVenue | null>(null);

    // Compute available segments from the data
    const availableSegments = useMemo(() => {
        const segs = new Map<string, number>();
        for (const e of events) {
            const cat = e.segment ?? e.genre;
            if (cat) segs.set(cat, (segs.get(cat) ?? 0) + 1);
        }
        return segs;
    }, [events]);

    // Group events by venue, filtering by date and category
    const venueGroups = useMemo<VenueGroup[]>(() => {
        const now = new Date();
        const range = getFilterRange(dateFilter);
        const venueMap = new Map<string, VenueGroup>();

        for (const e of events) {
            if (e.lat == null || e.lng == null) continue;

            // Filter past events
            if (e.startDate) {
                const eventDate = new Date(e.startDate);
                if (eventDate < now) continue;
                if (range && (eventDate < range.start || eventDate > range.end)) continue;
            }

            // Filter by segment/category
            if (genreFilter.size > 0) {
                const cat = bestCategory(e);
                if (!genreFilter.has(cat)) continue;
            }

            const key = coordKey(e.lat, e.lng);
            if (!venueMap.has(key)) {
                venueMap.set(key, {
                    venueName: e.venueName ?? 'Unknown Venue',
                    lat: e.lat,
                    lng: e.lng,
                    events: [],
                    category: bestCategory(e),
                });
            }
            venueMap.get(key)!.events.push(e);
        }

        return Array.from(venueMap.values());
    }, [events, dateFilter, genreFilter]);

    // GeoJSON with category color info
    const geojson = useMemo<FeatureCollection>(() => ({
        type: 'FeatureCollection',
        features: venueGroups.map((v) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
            properties: {
                venueKey: coordKey(v.lat, v.lng),
                venueName: v.venueName,
                eventCount: v.events.length,
                category: v.category,
                color: categoryColor(v.events[0]?.segment ?? null, v.events[0]?.genre ?? null),
                label: v.events.length > 1
                    ? `${v.venueName} (${v.events.length})`
                    : v.events[0].name,
            },
        })),
    }), [venueGroups]);

    // Mapbox match expression for circle-color
    const colorExpression = useMemo(() => {
        const expr: any[] = ['match', ['get', 'category']];
        for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
            expr.push(cat, color);
        }
        expr.push(DEFAULT_COLOR);
        return expr;
    }, []);

    // Click handler for venue markers
    useEffect(() => {
        const m = map?.getMap();
        if (!m || !showTicketmasterEvents) return;

        const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
            const feature = e.features?.[0];
            if (!feature || !feature.properties) return;
            const coords = (feature.geometry as GeoJSON.Point).coordinates;
            const key = feature.properties.venueKey;
            const venue = venueGroups.find((v) => coordKey(v.lat, v.lng) === key);
            if (!venue) return;
            setSelected({ longitude: coords[0], latitude: coords[1], venue });
        };

        m.on('click', 'ticketmaster-events', handleClick);
        const onEnter = () => { m.getCanvas().style.cursor = 'pointer'; };
        const onLeave = () => { m.getCanvas().style.cursor = ''; };
        m.on('mouseenter', 'ticketmaster-events', onEnter);
        m.on('mouseleave', 'ticketmaster-events', onLeave);

        return () => {
            m.off('click', 'ticketmaster-events', handleClick);
            m.off('mouseenter', 'ticketmaster-events', onEnter);
            m.off('mouseleave', 'ticketmaster-events', onLeave);
        };
    }, [map, showTicketmasterEvents, venueGroups]);

    useEffect(() => {
        if (!showTicketmasterEvents) setSelected(null);
    }, [showTicketmasterEvents]);

    const vis = showTicketmasterEvents ? 'visible' : 'none';

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'TBD';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
            });
        } catch { return dateStr; }
    };

    const countForFilter = (filterKey: 'today' | 'tomorrow' | 'week') => {
        const now = new Date();
        const range = getFilterRange(filterKey);
        let count = 0;
        for (const e of events) {
            if (!e.startDate || e.lat == null || e.lng == null) continue;
            if (genreFilter.size > 0 && !genreFilter.has(bestCategory(e))) continue;
            const d = new Date(e.startDate);
            if (d < now) continue;
            if (d < range.start || d > range.end) continue;
            count++;
        }
        return count;
    };

    /** Build the full category label for display: segment > genre > subGenre */
    const categoryLabel = (ev: TicketmasterEvent) => {
        const parts = [ev.segment, ev.genre, ev.subGenre].filter(Boolean);
        return parts.join(' · ') || 'Uncategorized';
    };

    return (
        <>
            <Source id="ticketmaster-events" type="geojson" data={geojson}>
                <Layer
                    id="ticketmaster-events-glow"
                    type="circle"
                    paint={{
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 22],
                        'circle-color': colorExpression as any,
                        'circle-opacity': 0.25,
                        'circle-blur': 1,
                    }}
                    layout={{ visibility: vis }}
                />
                <Layer
                    id="ticketmaster-events"
                    type="circle"
                    paint={{
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 14, 12],
                        'circle-color': colorExpression as any,
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-width': 2.5,
                        'circle-opacity': 1,
                    }}
                    layout={{ visibility: vis }}
                />
                <Layer
                    id="ticketmaster-event-labels"
                    type="symbol"
                    minzoom={13}
                    layout={{
                        'text-field': ['get', 'label'],
                        'text-size': 11,
                        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                        'text-anchor': 'left',
                        'text-offset': [1.2, 0],
                        'text-allow-overlap': false,
                        'text-max-width': 10,
                        visibility: vis,
                    }}
                    paint={{
                        'text-color': '#c1121f',
                        'text-halo-color': '#ffffff',
                        'text-halo-width': 1.5,
                    }}
                />
            </Source>

            {showTicketmasterEvents && (
                <View style={styles.filterContainer}>
                    {/* Date filter row */}
                    <View style={styles.filterRow}>
                        {DATE_OPTIONS.map((opt) => {
                            const count = countForFilter(opt.key);
                            return (
                                <Pressable
                                    key={opt.key}
                                    style={[styles.datePill, dateFilter === opt.key && styles.datePillActive]}
                                    onPress={() => setDateFilter(opt.key)}
                                >
                                    <Text style={[styles.datePillText, dateFilter === opt.key && styles.datePillTextActive]}>
                                        {opt.label} ({count})
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Category (segment) filter row */}
                    <View style={styles.categoryRow}>
                        {CATEGORY_CHIPS.filter(c => availableSegments.has(c.key)).map((chip) => {
                            const isActive = genreFilter.has(chip.key);
                            const chipColor = CATEGORY_COLORS[chip.key] ?? DEFAULT_COLOR;
                            const count = availableSegments.get(chip.key) ?? 0;
                            return (
                                <Pressable
                                    key={chip.key}
                                    style={[
                                        styles.categoryPill,
                                        isActive && { backgroundColor: chipColor },
                                        !isActive && genreFilter.size > 0 && styles.categoryPillDimmed,
                                    ]}
                                    onPress={() => toggleGenre(chip.key)}
                                >
                                    <Text style={styles.categoryEmoji}>{chip.emoji}</Text>
                                    <Text style={[
                                        styles.categoryPillText,
                                        isActive && styles.categoryPillTextActive,
                                    ]}>
                                        {chip.label}
                                    </Text>
                                    <Text style={[
                                        styles.categoryCount,
                                        isActive && styles.categoryPillTextActive,
                                    ]}>
                                        {count}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            )}

            {selected && (
                <Popup
                    longitude={selected.longitude}
                    latitude={selected.latitude}
                    anchor="bottom"
                    offset={14}
                    closeOnClick={false}
                    onClose={() => setSelected(null)}
                    style={{ maxWidth: '320px' }}
                >
                    <View style={styles.popup}>
                        <View style={[styles.colorBand, {
                            backgroundColor: categoryColor(
                                selected.venue.events[0]?.segment ?? null,
                                selected.venue.events[0]?.genre ?? null
                            ),
                        }]} />
                        <View style={styles.content}>
                            <Text style={styles.venueName}>{selected.venue.venueName}</Text>
                            <View style={styles.venueMetaRow}>
                                <Text style={styles.eventCount}>
                                    {selected.venue.events.length} event{selected.venue.events.length > 1 ? 's' : ''}
                                </Text>
                                {selected.venue.category ? (
                                    <View style={[styles.catBadge, {
                                        backgroundColor: categoryColor(
                                            selected.venue.events[0]?.segment ?? null,
                                            selected.venue.events[0]?.genre ?? null
                                        ),
                                    }]}>
                                        <Text style={styles.catBadgeText}>{selected.venue.category}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <ScrollView style={styles.eventList}>
                                {selected.venue.events.slice(0, 5).map((ev) => (
                                    <Pressable
                                        key={ev.id}
                                        style={styles.eventItem}
                                        onPress={() => Linking.openURL(ev.url)}
                                    >
                                        <View style={styles.eventRow}>
                                            {ev.imageUrl ? (
                                                <Image source={{ uri: ev.imageUrl }} style={styles.eventImage} />
                                            ) : null}
                                            <View style={styles.eventInfo}>
                                                <Text style={styles.eventName} numberOfLines={2}>{ev.name}</Text>
                                                <Text style={styles.eventDate}>{formatDate(ev.startDate)}</Text>
                                                <Text style={styles.eventCategory}>{categoryLabel(ev)}</Text>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>
                            {selected.venue.events.length > 5 && (
                                <Text style={styles.moreText}>+{selected.venue.events.length - 5} more</Text>
                            )}
                        </View>
                    </View>
                </Popup>
            )}
        </>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    filterContainer: {
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: [{ translateX: -230 }],
        width: 460,
        zIndex: 20,
        gap: 6,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(26, 26, 46, 0.88)',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'center',
    },
    datePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    datePillActive: {
        backgroundColor: '#ff4d4d',
    },
    datePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#a1a1aa',
    },
    datePillTextActive: {
        color: '#ffffff',
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'center',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: 'rgba(26, 26, 46, 0.88)',
        gap: 4,
    },
    categoryPillDimmed: {
        opacity: 0.45,
    },
    categoryEmoji: {
        fontSize: 13,
    },
    categoryPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#d4d4d8',
    },
    categoryPillTextActive: {
        color: '#ffffff',
    },
    categoryCount: {
        fontSize: 10,
        fontWeight: '700',
        color: '#71717a',
    },
    popup: {
        minWidth: 240,
    },
    colorBand: {
        height: 4,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    content: {
        padding: 12,
    },
    venueName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 2,
    },
    venueMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    eventCount: {
        fontSize: 11,
        color: '#71717a',
    },
    catBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    catBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#fff',
    },
    eventList: {
        maxHeight: 240,
    },
    eventItem: {
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    eventRow: {
        flexDirection: 'row',
        gap: 10,
    },
    eventImage: {
        width: 56,
        height: 56,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
    },
    eventInfo: {
        flex: 1,
    },
    eventName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a2e',
    },
    eventDate: {
        fontSize: 11,
        color: '#52525b',
        marginTop: 2,
    },
    eventCategory: {
        fontSize: 10,
        color: '#a1a1aa',
        marginTop: 1,
    },
    moreText: {
        fontSize: 11,
        color: '#71717a',
        textAlign: 'center',
        marginTop: 6,
    },
});

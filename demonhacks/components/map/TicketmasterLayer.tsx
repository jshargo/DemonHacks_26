// TicketmasterLayer — Ticketmaster event markers on the map.
// Fetches events via useTicketmasterEvents hook, converts to GeoJSON,
// renders circle markers + labels, and shows a popup on click.
// Groups multiple events at the same venue into a single marker.
// Includes date filter pills: Today, Tomorrow, This Week, All.

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, ScrollView } from 'react-native';
import { Source, Layer, Popup, useMap } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import { useCTAStore } from '@/stores/cta-store';
import { useTicketmasterEvents } from '@/hooks/useTicketmasterEvents';
import type { TicketmasterEvent } from '@/lib/ticketmaster';

interface VenueGroup {
    venueName: string;
    lat: number;
    lng: number;
    events: TicketmasterEvent[];
}

interface SelectedVenue {
    longitude: number;
    latitude: number;
    venue: VenueGroup;
}

/** Round coords to ~11m precision so nearby pins collapse into one */
function coordKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/** Get the end-of-day cutoff date for the given filter */
function getFilterCutoff(filter: 'all' | 'today' | 'tomorrow' | 'week'): Date | null {
    if (filter === 'all') return null;

    const now = new Date();
    const cutoff = new Date(now);

    if (filter === 'today') {
        cutoff.setHours(23, 59, 59, 999);
    } else if (filter === 'tomorrow') {
        cutoff.setDate(cutoff.getDate() + 1);
        cutoff.setHours(23, 59, 59, 999);
    } else if (filter === 'week') {
        cutoff.setDate(cutoff.getDate() + 7);
        cutoff.setHours(23, 59, 59, 999);
    }

    return cutoff;
}

const FILTER_OPTIONS = [
    { key: 'today' as const, label: 'Today' },
    { key: 'tomorrow' as const, label: 'Tomorrow' },
    { key: 'week' as const, label: 'This Week' },
    { key: 'all' as const, label: 'All' },
];

export default function TicketmasterLayer() {
    const showTicketmasterEvents = useCTAStore((s) => s.showTicketmasterEvents);
    const dateFilter = useCTAStore((s) => s.ticketmasterDateFilter);
    const setDateFilter = useCTAStore((s) => s.setTicketmasterDateFilter);
    const { events } = useTicketmasterEvents();
    const { current: map } = useMap();
    const [selected, setSelected] = useState<SelectedVenue | null>(null);

    // Group events by venue, filtering by date
    const venueGroups = useMemo<VenueGroup[]>(() => {
        const now = new Date();
        const cutoff = getFilterCutoff(dateFilter);
        const venueMap = new Map<string, VenueGroup>();

        for (const e of events) {
            if (e.lat == null || e.lng == null) continue;

            // Filter out past events
            if (e.startDate) {
                const eventDate = new Date(e.startDate);
                if (eventDate < now) continue;
                // Apply date filter cutoff
                if (cutoff && eventDate > cutoff) continue;
            }

            const key = coordKey(e.lat, e.lng);
            if (!venueMap.has(key)) {
                venueMap.set(key, {
                    venueName: e.venueName ?? 'Unknown Venue',
                    lat: e.lat,
                    lng: e.lng,
                    events: [],
                });
            }
            venueMap.get(key)!.events.push(e);
        }

        return Array.from(venueMap.values());
    }, [events, dateFilter]);

    // Convert venue groups to GeoJSON (one point per venue)
    const geojson = useMemo<FeatureCollection>(() => {
        return {
            type: 'FeatureCollection',
            features: venueGroups.map((v) => ({
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [v.lng, v.lat],
                },
                properties: {
                    venueKey: coordKey(v.lat, v.lng),
                    venueName: v.venueName,
                    eventCount: v.events.length,
                    label: v.events.length > 1
                        ? `${v.venueName} (${v.events.length})`
                        : v.events[0].name,
                },
            })),
        };
    }, [venueGroups]);

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

            setSelected({
                longitude: coords[0],
                latitude: coords[1],
                venue,
            });
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

    // Close popup when layer hidden
    useEffect(() => {
        if (!showTicketmasterEvents) setSelected(null);
    }, [showTicketmasterEvents]);

    const vis = showTicketmasterEvents ? 'visible' : 'none';

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'TBD';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <>
            <Source id="ticketmaster-events" type="geojson" data={geojson}>
                <Layer
                    id="ticketmaster-events-glow"
                    type="circle"
                    paint={{
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 22],
                        'circle-color': '#ff6b6b',
                        'circle-opacity': 0.3,
                        'circle-blur': 1,
                    }}
                    layout={{ visibility: vis }}
                />
                <Layer
                    id="ticketmaster-events"
                    type="circle"
                    paint={{
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 14, 12],
                        'circle-color': '#ff4d4d',
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
                <View style={styles.filterBar}>
                    {FILTER_OPTIONS.map((opt) => {
                        // Compute event count for this specific filter
                        const now = new Date();
                        const cutoff = getFilterCutoff(opt.key);
                        let count = 0;
                        for (const e of events) {
                            if (!e.startDate || e.lat == null || e.lng == null) continue;
                            const d = new Date(e.startDate);
                            if (d < now) continue;
                            if (cutoff && d > cutoff) continue;
                            count++;
                        }
                        return (
                            <Pressable
                                key={opt.key}
                                style={[
                                    styles.filterPill,
                                    dateFilter === opt.key && styles.filterPillActive,
                                ]}
                                onPress={() => setDateFilter(opt.key)}
                            >
                                <Text
                                    style={[
                                        styles.filterPillText,
                                        dateFilter === opt.key && styles.filterPillTextActive,
                                    ]}
                                >
                                    {opt.label} ({count})
                                </Text>
                            </Pressable>
                        );
                    })}
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
                    style={{ maxWidth: '300px' }}
                >
                    <View style={styles.popup}>
                        <View style={styles.colorBand} />
                        <View style={styles.content}>
                            <Text style={styles.venueName}>
                                {selected.venue.venueName}
                            </Text>
                            <Text style={styles.eventCount}>
                                {selected.venue.events.length} upcoming event{selected.venue.events.length > 1 ? 's' : ''}
                            </Text>
                            <ScrollView style={styles.eventList}>
                                {selected.venue.events.slice(0, 5).map((ev) => (
                                    <Pressable
                                        key={ev.id}
                                        style={styles.eventItem}
                                        onPress={() => Linking.openURL(ev.url)}
                                    >
                                        <Text style={styles.eventName} numberOfLines={1}>{ev.name}</Text>
                                        <Text style={styles.eventDate}>{formatDate(ev.startDate)}</Text>
                                        {(ev.genre || ev.subGenre) && (
                                            <Text style={styles.eventGenre}>
                                                {[ev.genre, ev.subGenre].filter(Boolean).join(' · ')}
                                            </Text>
                                        )}
                                    </Pressable>
                                ))}
                            </ScrollView>
                            {selected.venue.events.length > 5 && (
                                <Text style={styles.moreText}>
                                    +{selected.venue.events.length - 5} more events
                                </Text>
                            )}
                        </View>
                    </View>
                </Popup>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    filterBar: {
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: [{ translateX: -160 }],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(26, 26, 46, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 24,
        zIndex: 20,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: 'transparent',
    },
    filterPillActive: {
        backgroundColor: '#ff4d4d',
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#a1a1aa',
    },
    filterPillTextActive: {
        color: '#ffffff',
    },
    filterCount: {
        marginLeft: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 77, 77, 0.2)',
    },
    filterCountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#ff6b6b',
    },
    popup: {
        minWidth: 220,
    },
    colorBand: {
        height: 4,
        backgroundColor: '#ff4d4d',
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
    eventCount: {
        fontSize: 11,
        color: '#71717a',
        marginBottom: 8,
    },
    eventList: {
        maxHeight: 200,
    },
    eventItem: {
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    eventName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#ff4d4d',
    },
    eventDate: {
        fontSize: 11,
        color: '#52525b',
        marginTop: 2,
    },
    eventGenre: {
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

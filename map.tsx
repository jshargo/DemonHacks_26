import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, Spacing, Radius } from '../../src/theme/tokens';
import { fetchEvents } from '../../src/services/ticketmaster';
import { fetchRestaurants } from '../../src/services/yelp';
import { mockBikeStations } from '../../src/services/mockData';
import type { Event, Venue } from '../../src/types';

// Chicago center coordinates
const CHICAGO_CENTER = { latitude: 41.8781, longitude: -87.6298 };

interface MapLayer {
    key: string;
    label: string;
    emoji: string;
    active: boolean;
}

// Inject mapbox-gl CSS into the document head on web
function injectMapboxCSS() {
    if (Platform.OS !== 'web') return;
    if (document.getElementById('maplibre-gl-css')) return;
    const link = document.createElement('link');
    link.id = 'maplibre-gl-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
    document.head.appendChild(link);
}

export default function MapScreen() {
    const { colors, isDark } = useTheme();
    const mapContainerRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedPin, setSelectedPin] = useState<any>(null);
    const [mapReady, setMapReady] = useState(false);
    const [layers, setLayers] = useState<MapLayer[]>([
        { key: 'events', label: 'Events', emoji: '🎫', active: true },
        { key: 'food', label: 'Food', emoji: '🍕', active: true },
        { key: 'bikes', label: 'Divvy', emoji: '🚲', active: false },
        { key: 'safety', label: 'Safety', emoji: '🔦', active: false },
    ]);

    useEffect(() => {
        loadData();
        if (Platform.OS === 'web') {
            injectMapboxCSS();
        }
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        // Small delay to ensure CSS is loaded and container is mounted
        const timer = setTimeout(() => {
            initMap();
        }, 500);
        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (mapReady) {
            updateMarkers();
        }
    }, [events, venues, layers, mapReady]);

    async function loadData() {
        const [eventsData, venuesData] = await Promise.all([
            fetchEvents(),
            fetchRestaurants(),
        ]);
        setEvents(eventsData);
        setVenues(venuesData);
    }

    function initMap() {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        try {
            const maplibregl = require('maplibre-gl');

            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: isDark
                    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
                    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
                center: [CHICAGO_CENTER.longitude, CHICAGO_CENTER.latitude],
                zoom: 12,
                attributionControl: false,
            });

            map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
            mapInstanceRef.current = map;

            map.on('load', () => {
                setMapReady(true);
            });
        } catch (err) {
            console.error('Map init error:', err);
        }
    }

    function clearMarkers() {
        markersRef.current.forEach(m => {
            try { m.remove(); } catch (e) { }
        });
        markersRef.current = [];
    }

    function updateMarkers() {
        if (!mapInstanceRef.current) return;

        const maplibregl = require('maplibre-gl');
        clearMarkers();

        const isLayerActive = (key: string) => layers.find(l => l.key === key)?.active;

        // Event markers
        if (isLayerActive('events')) {
            events.forEach(event => {
                const el = document.createElement('div');
                el.style.cssText = `
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #A855F7, #7C3AED);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(168, 85, 247, 0.5);
          cursor: pointer; font-size: 18px; border: 2.5px solid #FFF;
          transition: transform 0.2s ease;
        `;
                el.innerHTML = '🎫';
                el.onmouseenter = () => { el.style.transform = 'scale(1.25)'; };
                el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
                el.onclick = () => setSelectedPin({ type: 'event', data: event });

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([event.longitude, event.latitude])
                    .addTo(mapInstanceRef.current);
                markersRef.current.push(marker);
            });
        }

        // Venue markers
        if (isLayerActive('food')) {
            venues.forEach(venue => {
                const el = document.createElement('div');
                el.style.cssText = `
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #F97316, #EA580C);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(249, 115, 22, 0.5);
          cursor: pointer; font-size: 18px; border: 2.5px solid #FFF;
          transition: transform 0.2s ease;
        `;
                el.innerHTML = '🍕';
                el.onmouseenter = () => { el.style.transform = 'scale(1.25)'; };
                el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
                el.onclick = () => setSelectedPin({ type: 'venue', data: venue });

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([venue.longitude, venue.latitude])
                    .addTo(mapInstanceRef.current);
                markersRef.current.push(marker);
            });
        }

        // Bike station markers
        if (isLayerActive('bikes')) {
            mockBikeStations.forEach(station => {
                const el = document.createElement('div');
                el.style.cssText = `
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #0EA5E9, #0284C7);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.5);
          cursor: pointer; font-size: 16px; border: 2px solid #FFF;
          transition: transform 0.2s ease;
        `;
                el.innerHTML = '🚲';
                el.onmouseenter = () => { el.style.transform = 'scale(1.25)'; };
                el.onmouseleave = () => { el.style.transform = 'scale(1)'; };
                el.onclick = () => setSelectedPin({ type: 'bike', data: station });

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat([station.longitude, station.latitude])
                    .addTo(mapInstanceRef.current);
                markersRef.current.push(marker);
            });
        }
    }

    function toggleLayer(key: string) {
        setLayers(prev => prev.map(l =>
            l.key === key ? { ...l, active: !l.active } : l
        ));
    }

    function renderBottomSheet() {
        if (!selectedPin) return null;
        const { type, data } = selectedPin;

        return (
            <View style={[styles.bottomSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sheetHandle}>
                    <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPin(null)}>
                    <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
                {type === 'event' && (
                    <>
                        <Text style={[styles.sheetTitle, { color: colors.text }]}>{data.name}</Text>
                        <Text style={[styles.sheetSubtitle, { color: colors.accent }]}>🎫 {data.date} · {data.time}</Text>
                        <Text style={[styles.sheetDetail, { color: colors.textSecondary }]}>📍 {data.venue}</Text>
                        <Text style={[styles.sheetDetail, { color: colors.textSecondary }]}>{data.priceRange}</Text>
                    </>
                )}
                {type === 'venue' && (
                    <>
                        <Text style={[styles.sheetTitle, { color: colors.text }]}>{data.name}</Text>
                        <Text style={[styles.sheetSubtitle, { color: '#FBBF24' }]}>★ {data.rating} · {data.categories?.[0]}</Text>
                        <Text style={[styles.sheetDetail, { color: colors.textSecondary }]}>📍 {data.address}</Text>
                        <Text style={[styles.sheetDetail, { color: colors.textSecondary }]}>{'$'.repeat(data.priceLevel)} · {data.distance}</Text>
                    </>
                )}
                {type === 'bike' && (
                    <>
                        <Text style={[styles.sheetTitle, { color: colors.text }]}>🚲 {data.name}</Text>
                        <View style={styles.bikeStats}>
                            <View style={[styles.bikeStat, { backgroundColor: colors.successBg }]}>
                                <Text style={[styles.bikeStatValue, { color: colors.success }]}>{data.bikesAvailable}</Text>
                                <Text style={[styles.bikeStatLabel, { color: colors.textSecondary }]}>Bikes</Text>
                            </View>
                            <View style={[styles.bikeStat, { backgroundColor: colors.secondaryBg }]}>
                                <Text style={[styles.bikeStatValue, { color: colors.secondary }]}>{data.docksAvailable}</Text>
                                <Text style={[styles.bikeStatLabel, { color: colors.textSecondary }]}>Docks</Text>
                            </View>
                        </View>
                    </>
                )}
                <TouchableOpacity style={[styles.sheetButton, { backgroundColor: colors.accent }]}>
                    <Text style={styles.sheetButtonText}>Get Directions →</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Layer Controls — positioned above map with higher z-index */}
            <View style={[styles.layerBar]}>
                {layers.map(layer => (
                    <TouchableOpacity
                        key={layer.key}
                        style={[
                            styles.layerPill,
                            {
                                backgroundColor: layer.active ? colors.accent : colors.surfaceElevated,
                                borderColor: layer.active ? colors.accent : colors.border,
                            },
                        ]}
                        onPress={() => toggleLayer(layer.key)}
                    >
                        <Text style={styles.layerEmoji}>{layer.emoji}</Text>
                        <Text style={[styles.layerLabel, { color: layer.active ? '#FFF' : colors.textSecondary }]}>
                            {layer.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Map Container (Web) */}
            {Platform.OS === 'web' ? (
                <div
                    ref={mapContainerRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: '100%',
                    }}
                />
            ) : (
                <View style={styles.mapFallback}>
                    <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
                        Map view (open on web for full map experience)
                    </Text>
                </View>
            )}

            {/* Bottom Sheet */}
            {renderBottomSheet()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    layerBar: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 16 : 60,
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 8,
        zIndex: 100,
        flexWrap: 'wrap',
    },
    layerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radius.full,
        borderWidth: 1,
        gap: 6,
    },
    layerEmoji: {
        fontSize: 14,
    },
    layerLabel: {
        ...Typography.captionSmall,
        fontWeight: '600',
    },
    mapFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackText: {
        ...Typography.body,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 80,
        left: 16,
        right: 16,
        borderRadius: Radius.xxl,
        padding: Spacing.xl,
        borderWidth: 1,
        zIndex: 200,
        maxWidth: 420,
        alignSelf: 'center',
    },
    sheetHandle: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.lg,
        right: Spacing.xl,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 18,
        fontWeight: '600',
    },
    sheetTitle: {
        ...Typography.h3,
        marginBottom: Spacing.xs,
    },
    sheetSubtitle: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    sheetDetail: {
        ...Typography.caption,
        marginBottom: 4,
    },
    bikeStats: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    bikeStat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
    },
    bikeStatValue: {
        ...Typography.h2,
    },
    bikeStatLabel: {
        ...Typography.captionSmall,
    },
    sheetButton: {
        marginTop: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        alignItems: 'center',
    },
    sheetButtonText: {
        color: '#FFF',
        ...Typography.bodyBold,
    },
});

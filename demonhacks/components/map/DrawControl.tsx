// DrawControl — freehand pen drawing on the map.
// When pen is ON: an invisible overlay captures pointer events.
// User clicks-and-drags to draw a freehand shape.
// On mouse-up the shape auto-closes into a polygon for spatial filtering.
// When pen is toggled OFF, the polygon is erased.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { Source, Layer } from 'react-map-gl/mapbox';
import { useDrawStore } from '@/stores/draw-store';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Feature, FeatureCollection, Polygon, LineString } from 'geojson';

// ─── GeoJSON helpers ───────────────────────────────────────────────────────

function polygonToGeoJSON(
    ring: [number, number][],
): FeatureCollection<Polygon> {
    const closed = [...ring, ring[0]];
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Polygon', coordinates: [closed] },
            } as Feature<Polygon>,
        ],
    };
}

function strokeToGeoJSON(
    points: [number, number][],
): FeatureCollection<LineString> {
    if (points.length < 2) {
        return { type: 'FeatureCollection', features: [] };
    }
    return {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: points },
            } as Feature<LineString>,
        ],
    };
}

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

// ─── Component ─────────────────────────────────────────────────────────────

interface DrawControlProps {
    /** ref to the react-map-gl Map, used to project screen→lngLat */
    mapRef: React.RefObject<MapRef | null>;
}

export default function DrawControl({ mapRef }: DrawControlProps) {
    const isDrawMode = useDrawStore((s) => s.isDrawMode);
    const isDrawing = useDrawStore((s) => s.isDrawing);
    const drawnPolygon = useDrawStore((s) => s.drawnPolygon);
    const activeStroke = useDrawStore((s) => s.activeStroke);
    const toggleDrawMode = useDrawStore((s) => s.toggleDrawMode);
    const startStroke = useDrawStore((s) => s.startStroke);
    const addStrokePoint = useDrawStore((s) => s.addStrokePoint);
    const finishStroke = useDrawStore((s) => s.finishStroke);

    // GeoJSON for Mapbox layers
    const polygonGeoJSON = useMemo(
        () => (drawnPolygon ? polygonToGeoJSON(drawnPolygon) : EMPTY_FC),
        [drawnPolygon],
    );
    const strokeGeoJSON = useMemo(
        () => strokeToGeoJSON(activeStroke),
        [activeStroke],
    );

    // Ref to persist the latest store functions for event handlers
    const storeRef = useRef({ startStroke, addStrokePoint, finishStroke });
    storeRef.current = { startStroke, addStrokePoint, finishStroke };

    // ── Freehand pointer events (attached to the map canvas directly) ────────
    useEffect(() => {
        if (Platform.OS !== 'web' || !isDrawMode) return;

        const map = mapRef.current?.getMap();
        if (!map) return;
        const canvas = map.getCanvas();

        // Disable all map interactions
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.dragRotate.disable();
        map.keyboard.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
        // @ts-ignore — touchPitch may not exist on older types
        map.touchPitch?.disable?.();
        canvas.style.cursor = 'crosshair';

        let drawing = false;

        const screenToLngLat = (e: PointerEvent): [number, number] => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ll = map.unproject([x, y]);
            return [ll.lng, ll.lat];
        };

        const onPointerDown = (e: PointerEvent) => {
            if (e.button !== 0) return; // left button only
            drawing = true;
            canvas.setPointerCapture(e.pointerId);
            storeRef.current.startStroke(screenToLngLat(e));
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!drawing) return;
            storeRef.current.addStrokePoint(screenToLngLat(e));
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!drawing) return;
            drawing = false;
            canvas.releasePointerCapture(e.pointerId);
            storeRef.current.finishStroke();
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);

        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);

            // Re-enable all map interactions
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.boxZoom.enable();
            map.dragRotate.enable();
            map.keyboard.enable();
            map.doubleClickZoom.enable();
            map.touchZoomRotate.enable();
            // @ts-ignore
            map.touchPitch?.enable?.();
            canvas.style.cursor = '';
        };
    }, [isDrawMode, mapRef]);

    return (
        <>
            {/* ── Completed polygon fill ──────────────────────────────────── */}
            <Source id="draw-polygon" type="geojson" data={polygonGeoJSON}>
                <Layer
                    id="draw-polygon-fill"
                    type="fill"
                    paint={{
                        'fill-color': '#3b82f6',
                        'fill-opacity': 0.18,
                    }}
                />
                <Layer
                    id="draw-polygon-stroke"
                    type="line"
                    paint={{
                        'line-color': '#3b82f6',
                        'line-width': 2.5,
                    }}
                />
            </Source>

            {/* ── Live ink stroke (while dragging) ─────────────────────────── */}
            <Source id="draw-active-stroke" type="geojson" data={strokeGeoJSON}>
                <Layer
                    id="draw-active-stroke-layer"
                    type="line"
                    paint={{
                        'line-color': '#ef4444',
                        'line-width': 2.5,
                    }}
                />
            </Source>
        </>
    );
}

// No styles — this component only renders GeoJSON layers inside the Map.

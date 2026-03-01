import { create } from 'zustand';

/** A polygon is an array of [lng, lat] coordinate pairs */
export type PolygonCoords = [number, number][];

interface DrawState {
    isDrawMode: boolean;
    /** The single freehand-drawn polygon boundary, or null if none */
    drawnPolygon: PolygonCoords | null;
    /** Points being recorded during an active freehand stroke */
    activeStroke: [number, number][];
    /** Whether the user is currently dragging (mouse/touch held down) */
    isDrawing: boolean;

    toggleDrawMode: () => void;
    setDrawMode: (on: boolean) => void;
    startStroke: (lngLat: [number, number]) => void;
    addStrokePoint: (lngLat: [number, number]) => void;
    finishStroke: () => void;
}

export const useDrawStore = create<DrawState>((set) => ({
    isDrawMode: false,
    drawnPolygon: null,
    activeStroke: [],
    isDrawing: false,

    toggleDrawMode: () =>
        set((s) => {
            if (s.isDrawMode) {
                // Turning OFF → erase everything
                return {
                    isDrawMode: false,
                    drawnPolygon: null,
                    activeStroke: [],
                    isDrawing: false,
                };
            }
            // Turning ON
            return { isDrawMode: true, drawnPolygon: null, activeStroke: [], isDrawing: false };
        }),

    setDrawMode: (on) =>
        set(on
            ? { isDrawMode: true, drawnPolygon: null, activeStroke: [], isDrawing: false }
            : { isDrawMode: false, drawnPolygon: null, activeStroke: [], isDrawing: false },
        ),

    startStroke: (lngLat) =>
        set({ activeStroke: [lngLat], isDrawing: true, drawnPolygon: null }),

    addStrokePoint: (lngLat) =>
        set((s) => {
            if (!s.isDrawing) return s;
            return { activeStroke: [...s.activeStroke, lngLat] };
        }),

    finishStroke: () =>
        set((s) => {
            if (s.activeStroke.length < 3) {
                return { activeStroke: [], isDrawing: false };
            }
            // Auto-close: the polygon is the stroke points (ring will be closed at render)
            return {
                drawnPolygon: s.activeStroke,
                activeStroke: [],
                isDrawing: false,
            };
        }),
}));

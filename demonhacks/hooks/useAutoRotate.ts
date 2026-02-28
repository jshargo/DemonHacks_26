// useAutoRotate — Slow camera rotation in 3D mode after 10s of idle
// Listens for user interaction at the window level. When no input is
// detected for 10 seconds, starts a rAF loop that increments bearing.
// Any interaction cancels the loop and restarts the idle timer.

import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

const IDLE_TIMEOUT_MS = 10_000;
const DEGREES_PER_SECOND = 3;

interface UseAutoRotateOptions {
  mapRef: React.RefObject<MapRef | null>;
  enabled: boolean;
}

export function useAutoRotate({ mapRef, enabled }: UseAutoRotateOptions) {
  const rafId = useRef(0);
  const timerId = useRef(0);
  const lastFrame = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const stopRotation = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = 0;
      }
    };

    const startRotation = () => {
      stopRotation();
      lastFrame.current = performance.now();

      const tick = (now: number) => {
        const map = mapRef.current;
        if (!map) return;

        const dt = (now - lastFrame.current) / 1000;
        lastFrame.current = now;

        const raw = map.getMap();
        const bearing = raw.getBearing() + DEGREES_PER_SECOND * dt;
        raw.setBearing(bearing);

        rafId.current = requestAnimationFrame(tick);
      };

      rafId.current = requestAnimationFrame(tick);
    };

    const resetIdle = () => {
      stopRotation();
      clearTimeout(timerId.current);
      timerId.current = window.setTimeout(startRotation, IDLE_TIMEOUT_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'touchstart',
      'wheel',
      'keydown',
    ];

    events.forEach((evt) => window.addEventListener(evt, resetIdle, { passive: true }));

    // Kick off the initial idle timer
    timerId.current = window.setTimeout(startRotation, IDLE_TIMEOUT_MS);

    return () => {
      stopRotation();
      clearTimeout(timerId.current);
      events.forEach((evt) => window.removeEventListener(evt, resetIdle));
    };
  }, [enabled, mapRef]);
}

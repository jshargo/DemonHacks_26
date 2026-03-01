// useCTATrainIcons — Generates and registers isometric 3D train icons per route color.
// Icons are registered with Mapbox via map.addImage() for use by Symbol Layers.
// Icons point UP (north) so Mapbox icon-rotate correctly orients them by heading.

import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { CTA_ROUTE_COLORS } from '@/lib/cta';

// Canvas dimensions (logical pixels, before retina scaling)
const ICON_WIDTH = 28;   // wider than body to fit 3D depth offset + shadow
const ICON_HEIGHT = 50;  // taller than body to fit shadow below
const PIXEL_RATIO = 2;   // retina

// Body dimensions within the canvas
const BODY_X = 3;
const BODY_Y = 4;
const BODY_W = 18;
const BODY_H = 38;
const CORNER_R = 4;
const DEPTH = 3;  // isometric depth offset (pixels)

/** Shift a hex color's RGB channels by `amount` (positive = lighter, negative = darker) */
function shadeColor(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `rgb(${r},${g},${b})`;
}

function drawTrainIcon(color: string): ImageData {
  const w = ICON_WIDTH * PIXEL_RATIO;
  const h = ICON_HEIGHT * PIXEL_RATIO;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  const dark = shadeColor(color, -70);
  const darker = shadeColor(color, -110);
  const light = shadeColor(color, 25);

  // ─── 1. Drop shadow ────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.roundRect(BODY_X + DEPTH + 1, BODY_Y + DEPTH + 1, BODY_W, BODY_H, CORNER_R);
  ctx.fill();

  // ─── 2. Right side wall (isometric depth) ──────────────────────────
  // Trapezoid connecting right edge of roof to offset right edge
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(BODY_X + BODY_W, BODY_Y + CORNER_R);
  ctx.lineTo(BODY_X + BODY_W + DEPTH, BODY_Y + CORNER_R + DEPTH);
  ctx.lineTo(BODY_X + BODY_W + DEPTH, BODY_Y + BODY_H - CORNER_R + DEPTH);
  ctx.lineTo(BODY_X + BODY_W, BODY_Y + BODY_H - CORNER_R);
  ctx.closePath();
  ctx.fill();

  // Corner piece connecting side wall to bottom wall
  ctx.beginPath();
  ctx.moveTo(BODY_X + BODY_W, BODY_Y + BODY_H - CORNER_R);
  ctx.lineTo(BODY_X + BODY_W + DEPTH, BODY_Y + BODY_H - CORNER_R + DEPTH);
  ctx.lineTo(BODY_X + BODY_W - CORNER_R + DEPTH, BODY_Y + BODY_H + DEPTH);
  ctx.lineTo(BODY_X + BODY_W - CORNER_R, BODY_Y + BODY_H);
  ctx.closePath();
  ctx.fill();

  // ─── 3. Bottom wall (isometric depth) ──────────────────────────────
  ctx.fillStyle = darker;
  ctx.beginPath();
  ctx.moveTo(BODY_X + CORNER_R, BODY_Y + BODY_H);
  ctx.lineTo(BODY_X + CORNER_R + DEPTH, BODY_Y + BODY_H + DEPTH);
  ctx.lineTo(BODY_X + BODY_W - CORNER_R + DEPTH, BODY_Y + BODY_H + DEPTH);
  ctx.lineTo(BODY_X + BODY_W - CORNER_R, BODY_Y + BODY_H);
  ctx.closePath();
  ctx.fill();

  // ─── 4. Main body / roof surface ──────────────────────────────────
  ctx.beginPath();
  ctx.roundRect(BODY_X, BODY_Y, BODY_W, BODY_H, CORNER_R);

  // Left-to-right gradient simulates overhead lighting
  const grad = ctx.createLinearGradient(BODY_X, 0, BODY_X + BODY_W, 0);
  grad.addColorStop(0, light);
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();

  // Thin border
  ctx.strokeStyle = darker;
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // ─── 5. Roof highlight stripe ─────────────────────────────────────
  // Vertical white line near left edge simulates light reflection
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(BODY_X + 3.5, BODY_Y + CORNER_R + 2);
  ctx.lineTo(BODY_X + 3.5, BODY_Y + BODY_H - CORNER_R - 2);
  ctx.stroke();

  // ─── 6. Windshield / cab window at nose (top) ─────────────────────
  ctx.fillStyle = 'rgba(180,220,255,0.65)';
  ctx.beginPath();
  ctx.roundRect(BODY_X + 3, BODY_Y + 2, BODY_W - 6, 6, 2);
  ctx.fill();

  // ─── 7. Passenger windows ─────────────────────────────────────────
  ctx.fillStyle = 'rgba(200,230,255,0.5)';
  const winX = BODY_X + 4.5;
  const winW = BODY_W - 9;
  const winH = 3;
  for (let wy = BODY_Y + 12; wy + winH < BODY_Y + BODY_H - 4; wy += 6) {
    ctx.beginPath();
    ctx.roundRect(winX, wy, winW, winH, 1);
    ctx.fill();
  }


  return ctx.getImageData(0, 0, w, h);
}

export function useCTATrainIcons(mapRef: React.RefObject<MapRef | null>, mapLoaded: boolean) {
  const registered = useRef(false);

  useEffect(() => {
    if (!mapLoaded || registered.current) return;

    const map = mapRef.current?.getMap();
    if (!map) return;

    // Register an icon for each route color
    for (const [routeCode, color] of Object.entries(CTA_ROUTE_COLORS)) {
      const name = `train-${routeCode}`;
      if (!map.hasImage(name)) {
        const imageData = drawTrainIcon(color);
        map.addImage(name, imageData, {
          pixelRatio: PIXEL_RATIO,
        });
      }
    }

    registered.current = true;
  }, [mapRef, mapLoaded]);
}

// useCTATrainIcons — Generates and registers canvas-drawn train icons per route color.
// Icons are registered with Mapbox via map.addImage() for use by Symbol Layers.

import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { CTA_ROUTE_COLORS } from '@/lib/cta';

const ICON_WIDTH = 48;
const ICON_HEIGHT = 24;
const PIXEL_RATIO = 2; // retina

function drawTrainIcon(color: string): ImageData {
  const w = ICON_WIDTH * PIXEL_RATIO;
  const h = ICON_HEIGHT * PIXEL_RATIO;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;

  // Train body — elongated rounded rect
  const bodyX = 4;
  const bodyY = 3;
  const bodyW = ICON_WIDTH - 8;
  const bodyH = ICON_HEIGHT - 6;
  const radius = 5;

  ctx.beginPath();
  // Left side (rounded)
  ctx.moveTo(bodyX + radius, bodyY);
  // Top edge
  ctx.lineTo(bodyX + bodyW - 6, bodyY);
  // Nose (pointed right side)
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH / 2);
  ctx.lineTo(bodyX + bodyW - 6, bodyY + bodyH);
  // Bottom edge
  ctx.lineTo(bodyX + radius, bodyY + bodyH);
  // Left rounded corners
  ctx.arcTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - radius, radius);
  ctx.lineTo(bodyX, bodyY + radius);
  ctx.arcTo(bodyX, bodyY, bodyX + radius, bodyY, radius);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  // Reset shadow for stroke
  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Windshield area (small white rectangle near nose)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  const wsX = bodyX + bodyW - 14;
  const wsY = bodyY + 4;
  const wsW = 6;
  const wsH = bodyH - 8;
  ctx.roundRect(wsX, wsY, wsW, wsH, 2);
  ctx.fill();

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

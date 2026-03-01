// optimize-overlays.ts — Strip unnecessary properties, reduce coordinate precision,
// and add normalized color properties for CTA overlay GeoJSON files.
// Run: cd demonhacks && npx tsx scripts/optimize-overlays.ts

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const OVERLAYS_DIR = resolve(__dirname, '../../overlays');
const OUTPUT_DIR = resolve(__dirname, '../public');

// Legend code → hex color for rail lines
const LEGEND_COLORS: Record<string, string> = {
  RD: '#c60c30',
  BL: '#00a1de',
  BR: '#62361b',
  GR: '#009b3a',
  OR: '#f9461c',
  PR: '#522398',
  PK: '#e27ea6',
  YL: '#f9e300',
  ML: '#565a5c', // Multi-line shared segments
};

// Legend name → color for station points
const STATION_LEGEND_COLORS: Record<string, string> = {
  'Red Line': '#c60c30',
  'Blue Line': '#00a1de',
  'Brown Line': '#62361b',
  'Green Line': '#009b3a',
  'Orange Line': '#f9461c',
  'Purple Line': '#522398',
  'Pink Line': '#e27ea6',
  'Yellow Line': '#f9e300',
  'Multiple Lines': '#565a5c',
};

function roundCoord(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

function roundCoords(coords: unknown): unknown {
  if (typeof coords === 'number') return roundCoord(coords);
  if (Array.isArray(coords)) return coords.map(roundCoords);
  return coords;
}

interface GeoJSONFeature {
  type: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

function loadGeoJSON(filename: string): GeoJSONCollection {
  const raw = readFileSync(resolve(OVERLAYS_DIR, filename), 'utf-8');
  return JSON.parse(raw);
}

function saveGeoJSON(filename: string, data: GeoJSONCollection) {
  writeFileSync(resolve(OUTPUT_DIR, filename), JSON.stringify(data));
  const sizeMB = (Buffer.byteLength(JSON.stringify(data)) / 1024 / 1024).toFixed(2);
  console.log(`  → ${filename} (${data.features.length} features, ${sizeMB} MB)`);
}

// ─── Rail Lines ───
function optimizeRailLines() {
  console.log('Processing rail lines...');
  const data = loadGeoJSON("CTA_-_'L'_(Rail)_Lines_20260228.geojson");

  const optimized: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: data.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: f.geometry.type,
        coordinates: roundCoords(f.geometry.coordinates) as number[][][],
      },
      properties: {
        legend: f.properties.legend,
        lines: f.properties.lines,
        description: f.properties.description,
        color: LEGEND_COLORS[(f.properties.legend as string)] || '#565a5c',
      },
    })),
  };

  saveGeoJSON('cta-rail-lines.geojson', optimized);
}

// ─── Rail Stations ───
function optimizeRailStations() {
  console.log('Processing rail stations...');
  const data = loadGeoJSON("CTA_-_'L'_(Rail)_Stations_20260228.geojson");

  const optimized: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: data.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: f.geometry.type,
        coordinates: roundCoords(f.geometry.coordinates) as number[],
      },
      properties: {
        station_id: f.properties.station_id,
        name: f.properties.longname,
        lines: f.properties.lines,
        ada: f.properties.ada,
        address: f.properties.address,
        legend: f.properties.legend,
        color: STATION_LEGEND_COLORS[(f.properties.legend as string)] || '#565a5c',
      },
    })),
  };

  saveGeoJSON('cta-rail-stations.geojson', optimized);
}

// ─── Bus Routes ───
function optimizeBusRoutes() {
  console.log('Processing bus routes...');
  const data = loadGeoJSON('CTA_-_Bus_Routes_20260228 (1).geojson');

  const optimized: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: data.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: f.geometry.type,
        coordinates: roundCoords(f.geometry.coordinates) as number[][][],
      },
      properties: {
        route: f.properties.route,
        name: f.properties.name,
      },
    })),
  };

  saveGeoJSON('cta-bus-routes.geojson', optimized);
}

// ─── Bus Stops ───
function optimizeBusStops() {
  console.log('Processing bus stops...');
  const data = loadGeoJSON('CTA_BusStops_20260228.geojson');

  const optimized: GeoJSONCollection = {
    type: 'FeatureCollection',
    features: data.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: f.geometry.type,
        coordinates: roundCoords(f.geometry.coordinates) as number[],
      },
      properties: {
        name: f.properties.public_nam,
        routes: f.properties.routesstpg,
        dir: f.properties.dir,
      },
    })),
  };

  saveGeoJSON('cta-bus-stops.geojson', optimized);
}

// ─── Main ───
mkdirSync(OUTPUT_DIR, { recursive: true });
console.log('Optimizing CTA overlay GeoJSON files...\n');

optimizeRailLines();
optimizeRailStations();
optimizeBusRoutes();
optimizeBusStops();

console.log('\nDone! Optimized files written to demonhacks/public/');

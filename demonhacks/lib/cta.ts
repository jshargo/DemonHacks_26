// CTA Train Tracker API client, types, and constants.
// Docs: https://www.transitchicago.com/developers/traintracker/

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CTARouteCode = 'Red' | 'Blue' | 'Brn' | 'G' | 'Org' | 'P' | 'Pink' | 'Y';

/** A single train's live position from the Locations API */
export interface CTATrain {
  rn: string;        // Run number (unique per run)
  rt: string;        // Route code (Red, Blue, etc.)
  lat: number;
  lon: number;
  heading: number;   // 0-359 degrees
  destNm: string;    // Destination name (e.g. "Howard")
  nextStaNm: string; // Next station name
  isDly: boolean;    // Is delayed
  isApp: boolean;    // Is approaching next station
  prdt: string;      // Prediction generated time
  arrT: string;      // Arrival time at next station
}

/** Detail for a specific train run from the Follow API */
export interface CTATrainDetail {
  rn: string;
  rt: string;
  destNm: string;
  stops: Array<{
    staNm: string;
    stpDe: string;
    arrT: string;
    isApp: boolean;
    isDly: boolean;
    prdt: string;
  }>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** CTA L route colors (official brand colors) */
export const CTA_ROUTE_COLORS: Record<string, string> = {
  Red:  '#c60c30',
  Blue: '#00a1de',
  Brn:  '#62361b',
  G:    '#009b3a',
  Org:  '#f9461c',
  P:    '#522398',
  Pink: '#e27ea6',
  Y:    '#f9e300',
};

/** Display names for route codes */
export const CTA_ROUTE_NAMES: Record<string, string> = {
  Red:  'Red Line',
  Blue: 'Blue Line',
  Brn:  'Brown Line',
  G:    'Green Line',
  Org:  'Orange Line',
  P:    'Purple Line',
  Pink: 'Pink Line',
  Y:    'Yellow Line',
};

/** All CTA L route codes for the Locations API */
export const CTA_ALL_ROUTES: CTARouteCode[] = ['Red', 'Blue', 'Brn', 'G', 'Org', 'P', 'Pink', 'Y'];

/** Legend code → route code mapping (for linking GeoJSON legend to API route codes) */
export const LEGEND_TO_ROUTE: Record<string, string> = {
  RD: 'Red',
  BL: 'Blue',
  BR: 'Brn',
  GR: 'G',
  OR: 'Org',
  PR: 'P',
  PK: 'Pink',
  YL: 'Y',
  ML: 'ML',
};

// ─── API Client ────────────────────────────────────────────────────────────────
// All CTA API calls go through our FastAPI backend (handles CORS + keeps key server-side).

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

/**
 * Fetch all live train positions across all routes via backend proxy.
 */
export async function fetchAllTrainPositions(): Promise<CTATrain[]> {
  const res = await fetch(`${API_BASE}/api/cta/trains`);
  if (!res.ok) throw new Error(`Backend API error: ${res.status}`);

  const data: { trains: CTATrain[]; timestamp: string } = await res.json();
  return data.trains;
}

/**
 * Fetch detail for a specific train run (upcoming station arrivals).
 */
export async function fetchTrainDetail(runNumber: string): Promise<CTATrainDetail | null> {
  const res = await fetch(`${API_BASE}/api/cta/trains/${runNumber}`);
  if (!res.ok) return null;

  return await res.json();
}

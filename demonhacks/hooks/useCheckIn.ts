import { useMemo } from 'react';
import { CHECK_IN_RADIUS_METERS } from '@/lib/constants';
import type { MapPin } from '@/lib/types';

interface CheckInState {
  isWithinRange: boolean;
  distanceMeters: number | null;
}

/**
 * Calculate distance between two GPS points using the Haversine formula.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if the user is within check-in range of a map pin.
 */
export function useCheckIn(
  userLat: number | null,
  userLng: number | null,
  pin: MapPin | null
): CheckInState {
  return useMemo(() => {
    if (userLat == null || userLng == null || !pin) {
      return { isWithinRange: false, distanceMeters: null };
    }

    const distance = haversineDistance(userLat, userLng, pin.lat, pin.lng);

    return {
      isWithinRange: distance <= CHECK_IN_RADIUS_METERS,
      distanceMeters: distance,
    };
  }, [userLat, userLng, pin?.lat, pin?.lng]);
}

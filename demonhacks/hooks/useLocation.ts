import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
  latitude: number;
  longitude: number;
}

/** Hook to get the user's current GPS location via expo-location */
export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      // Get initial position
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setLoading(false);

      // Watch for updates
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (loc) => {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    }

    startWatching();
    return () => { subscription?.remove(); };
  }, []);

  return { location, loading, error };
}

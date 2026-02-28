// Auth gate that redirects unauthenticated users to sign-in
// Owner: Person 1 (Auth + Profiles)

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export function useProtectedRoute() {
  const { session, loading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      // Redirect to main app if already authenticated
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);
}

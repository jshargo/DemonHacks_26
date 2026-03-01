// Auth gate that redirects unauthenticated users to sign-in
// Owner: Person 1 (Auth + Profiles)

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { usePreferencesStore } from '@/stores/preferences-store';

export function useProtectedRoute() {
  const { session, loading } = useAuthStore();
  const { onboardingComplete, preferencesLoading } = usePreferencesStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait for BOTH auth and preferences to finish loading
    if (loading || preferencesLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      // After sign-in/sign-up: go to onboarding if not done, else main app
      if (!onboardingComplete) {
        router.replace('/(onboarding)/interests');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && !inAuthGroup && !inOnboardingGroup && !onboardingComplete) {
      // Authenticated but hasn't completed onboarding yet
      router.replace('/(onboarding)/interests');
    } else if (session && inOnboardingGroup && onboardingComplete) {
      // Onboarding just finished — go to main app
      router.replace('/(tabs)');
    }
  }, [session, loading, preferencesLoading, segments, onboardingComplete]);
}

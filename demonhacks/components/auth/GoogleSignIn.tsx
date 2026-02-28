// TODO: Google OAuth sign-in button
// Owner: Person 1 (Auth + Profiles)
// - Uses expo-auth-session for Google OAuth
// - Calls Supabase signInWithOAuth on success
// - Shows branded Google sign-in button

import { Pressable, Text, StyleSheet } from 'react-native';

interface GoogleSignInProps {
  onPress: () => void;
}

export default function GoogleSignIn({ onPress }: GoogleSignInProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

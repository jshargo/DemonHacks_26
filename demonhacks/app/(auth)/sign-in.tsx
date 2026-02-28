// TODO: Sign-in screen
// Owner: Person 1 (Auth + Profiles)
// - Email + password form
// - Google OAuth button
// - Link to sign-up

import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useAuthStore();

  const handleSignIn = () => {
    signIn(email, password);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to explore Chicago</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleSignIn} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
      </Pressable>

      <GoogleSignIn onPress={() => {/* TODO: Google OAuth */}} />

      <Link href="/(auth)/sign-up" style={styles.link}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  error: { color: '#e74c3c', marginBottom: 12, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { marginTop: 16, alignSelf: 'center' },
  linkText: { color: '#4285F4', fontSize: 14 },
});

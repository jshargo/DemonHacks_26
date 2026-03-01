import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth-store';
import { Wordmark } from '@/components/ui/Wordmark';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, fonts } from '@/lib/theme';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error } = useAuthStore();

  const handleSignIn = () => {
    signIn(email, password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Wordmark size={32} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to explore Chicago</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.form}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Mail size={18} color={colors.textTertiary} />}
          />
          <TextInput
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Lock size={18} color={colors.textTertiary} />}
          />
        </View>

        <Button
          title={loading ? 'Signing in...' : 'Sign In'}
          variant="primary"
          size="lg"
          onPress={handleSignIn}
          disabled={loading}
          loading={loading}
          fullWidth
        />

        <Link href="/(auth)/sign-up" style={styles.link}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
          </Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing['2xl'],
    maxWidth: 420,
    width: '100%' as unknown as number,
    alignSelf: 'center',
  },
  header: {
    marginBottom: spacing['3xl'],
  },
  title: {
    ...typography.displayMd,
    color: colors.textPrimary,
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  link: {
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
  linkText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
  linkBold: {
    fontFamily: fonts.bold,
    color: colors.primary,
  },
});

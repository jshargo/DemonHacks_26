import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Mail, Lock, AtSign, UserCircle } from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth-store';
import { Wordmark } from '@/components/ui/Wordmark';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, fonts } from '@/lib/theme';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { signUp, loading, error } = useAuthStore();

  const handleSignUp = () => {
    signUp(email, password, username, displayName || undefined);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Wordmark size={32} />
            <Text style={styles.title}>Join ExploreChi</Text>
            <Text style={styles.subtitle}>
              Discover everything Chicago has to offer
            </Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.form}>
            <TextInput
              label="Username"
              placeholder="Pick a unique username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              leftIcon={<AtSign size={18} color={colors.textTertiary} />}
            />
            <TextInput
              label="Display Name"
              placeholder="How you want to appear"
              value={displayName}
              onChangeText={setDisplayName}
              leftIcon={<UserCircle size={18} color={colors.textTertiary} />}
            />
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
              placeholder="Choose a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Lock size={18} color={colors.textTertiary} />}
            />
          </View>

          <Button
            title={loading ? 'Creating account...' : 'Sign Up'}
            variant="primary"
            size="lg"
            onPress={handleSignUp}
            disabled={loading}
            loading={loading}
            fullWidth
          />

          <Link href="/(auth)/sign-in" style={styles.link}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
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

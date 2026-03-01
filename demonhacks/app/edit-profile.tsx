import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii, typography } from '@/lib/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [topInterest, setTopInterest] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        username: username.trim(),
        bio: topInterest || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile!.id);

    if (error) {
      Alert.alert('Error saving profile', error.message);
      setSaving(false);
      return;
    }

    await fetchProfile();
    setSaving(false);
    router.back();
  };

  const avatarInitial = (
    displayName[0] ||
    username[0] ||
    '?'
  ).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={saving} style={styles.headerBtn}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PROFILE PICTURE URL</Text>
          <TextInput
            style={styles.input}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="Paste an image URL (https://...)"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>NUMBER ONE THING I WANT TO EXPLORE</Text>
          <TextInput
            style={styles.input}
            value={topInterest}
            onChangeText={setTopInterest}
            placeholder="e.g. Live music, hiking, trying new food..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { minWidth: 60 },
  title: { ...typography.headingSm, color: colors.textPrimary },
  cancelText: { ...typography.bodyLg, color: colors.textSecondary },
  saveText: { ...typography.bodyLg, fontWeight: '600', color: colors.primary, textAlign: 'right' },
  content: { padding: spacing.xl, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.textInverse, fontSize: 38, fontWeight: 'bold' },
  field: { marginBottom: spacing['2xl'] },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    ...typography.bodyMd,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});

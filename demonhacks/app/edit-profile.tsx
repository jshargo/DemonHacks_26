// Edit profile screen — display name, username, avatar, top interest
// Owner: Person 1 (Auth + Profiles)

import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/ui/Header';
import { Avatar } from '@/components/ui/Avatar';
import { TextInput } from '@/components/ui/TextInput';
import { colors, fonts, typography, spacing } from '@/lib/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  // bio stores the category ID for "top interest"
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

  const avatarName = displayName || username || '?';

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Edit Profile"
        onBack={() => router.back()}
        rightAction={
          <Pressable onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          <Avatar
            imageUrl={avatarUrl || null}
            name={avatarName}
            size="xl"
          />
        </View>

        {/* Avatar URL */}
        <TextInput
          label="PROFILE PICTURE URL"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="Paste an image URL (https://...)"
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="done"
          containerStyle={styles.field}
        />

        {/* Display name */}
        <TextInput
          label="DISPLAY NAME"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          returnKeyType="next"
          containerStyle={styles.field}
        />

        {/* Username */}
        <TextInput
          label="USERNAME"
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          autoCapitalize="none"
          returnKeyType="next"
          containerStyle={styles.field}
        />

        {/* Top interest — free text */}
        <TextInput
          label="NUMBER ONE THING I WANT TO EXPLORE"
          value={topInterest}
          onChangeText={setTopInterest}
          placeholder="e.g. Live music, hiking, trying new food..."
          returnKeyType="done"
          containerStyle={styles.field}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  saveText: {
    ...typography.headingSm,
    color: colors.primary,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 60,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'] - 4,
  },
  field: {
    marginBottom: spacing['2xl'],
  },
});

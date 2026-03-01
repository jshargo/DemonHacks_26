// Edit profile screen — display name, username, avatar, top interest
// Owner: Person 1 (Auth + Profiles)

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

  const avatarInitial = (
    displayName[0] ||
    username[0] ||
    '?'
  ).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={saving} style={styles.headerBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#222" />
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
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
          )}
        </View>

        {/* Avatar URL */}
        <View style={styles.field}>
          <Text style={styles.label}>PROFILE PICTURE URL</Text>
          <TextInput
            style={styles.input}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            placeholder="Paste an image URL (https://...)"
            autoCapitalize="none"
            keyboardType="url"
            returnKeyType="done"
          />
        </View>

        {/* Display name */}
        <View style={styles.field}>
          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            returnKeyType="next"
          />
        </View>

        {/* Username */}
        <View style={styles.field}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        {/* Top interest — free text */}
        <View style={styles.field}>
          <Text style={styles.label}>NUMBER ONE THING I WANT TO EXPLORE</Text>
          <TextInput
            style={styles.input}
            value={topInterest}
            onChangeText={setTopInterest}
            placeholder="e.g. Live music, hiking, trying new food…"
            returnKeyType="done"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerBtn: { minWidth: 60 },
  title: { fontSize: 17, fontWeight: '600', color: '#222' },
  cancelText: { fontSize: 16, color: '#666' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#222', textAlign: 'right' },
  content: { padding: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 38, fontWeight: 'bold' },
  field: { marginBottom: 24 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
});

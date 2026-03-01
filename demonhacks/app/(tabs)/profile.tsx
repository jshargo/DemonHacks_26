// User profile screen — two-panel layout (left nav, right content)
// Owner: Person 1 (Auth + Profiles)

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  FlatList,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, MAX_CATEGORIES, maxSubsForCategory } from '@/lib/categories';
import { CategoryCard } from '@/components/onboarding/CategoryCard';
import { ChipGroup } from '@/components/onboarding/ChipGroup';

type Section = 'profile' | 'interests' | 'privacy';

function formatMemberSince(dateStr: string | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ProfileScreen() {
  const { session, profile, fetchProfile, signOut } = useAuthStore();
  const { selectedCategories, selectedSubcategories, toggleCategory, setSubInterests } =
    usePreferencesStore();

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saving, setSaving] = useState(false);

  // Edit Profile fields — sync whenever profile changes
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [topInterest, setTopInterest] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');

  // Privacy fields
  const [hideLocation, setHideLocation] = useState(profile?.hide_location ?? false);
  const [hideQuestProgress, setHideQuestProgress] = useState(profile?.hide_quest_progress ?? false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setUsername(profile?.username ?? '');
    setTopInterest(profile?.bio ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
    setHideLocation(profile?.hide_location ?? false);
    setHideQuestProgress(profile?.hide_quest_progress ?? false);
  }, [profile]);

  const handleSaveProfile = async () => {
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
        bio: topInterest.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile!.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchProfile();
    }
    setSaving(false);
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        hide_location: hideLocation,
        hide_quest_progress: hideQuestProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile!.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchProfile();
    }
    setSaving(false);
  };

  const handleSaveInterests = async () => {
    setSaving(true);
    const userId = session?.user.id;
    if (userId) {
      const { error } = await supabase.from('user_onboarding_preferences').upsert({
        user_id: userId,
        selected_categories: selectedCategories,
        selected_subcategories: selectedSubcategories,
        updated_at: new Date().toISOString(),
      });
      if (error) Alert.alert('Error', error.message);
    }
    setSaving(false);
  };

  const handleToggleSub = (categoryId: string, label: string) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId)!;
    const limit = maxSubsForCategory(cat);
    const current = selectedSubcategories[categoryId] ?? [];
    const exists = current.includes(label);
    const next = exists
      ? current.filter((x) => x !== label)
      : [...current, label].slice(0, limit);
    setSubInterests(categoryId, next);
  };

  const avatarInitial = (
    profile?.display_name?.[0] ??
    profile?.username?.[0] ??
    session?.user?.email?.[0] ??
    '?'
  ).toUpperCase();

  const memberSince = formatMemberSince(profile?.created_at);
  const chosenCategories = CATEGORIES.filter((c) => selectedCategories.includes(c.id));
  const atLimit = selectedCategories.length >= MAX_CATEGORIES;

  return (
    <View style={styles.root}>

      {/* ── Left Panel ── */}
      <View style={styles.leftPanel}>
        <ScrollView
          contentContainerStyle={styles.leftContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
          </View>

          {/* Name & username */}
          <Text style={styles.leftName} numberOfLines={2}>
            {profile?.display_name ?? profile?.username ?? 'Explorer'}
          </Text>
          {profile?.username && (
            <Text style={styles.leftUsername} numberOfLines={1}>
              @{profile.username}
            </Text>
          )}

          <View style={styles.divider} />

          {/* Quick info */}
          {profile?.bio && (
            <Text style={styles.infoLine} numberOfLines={2}>✦ {profile.bio}</Text>
          )}
          {memberSince && (
            <Text style={styles.infoLine}>🗓 {memberSince}</Text>
          )}

          <View style={styles.divider} />

          {/* Nav items */}
          <Pressable
            style={[styles.navItem, activeSection === 'profile' && styles.navItemActive]}
            onPress={() => setActiveSection('profile')}
          >
            <Text style={[styles.navText, activeSection === 'profile' && styles.navTextActive]}>
              Edit Profile
            </Text>
          </Pressable>

          <Pressable
            style={[styles.navItem, activeSection === 'interests' && styles.navItemActive]}
            onPress={() => setActiveSection('interests')}
          >
            <Text style={[styles.navText, activeSection === 'interests' && styles.navTextActive]}>
              My Interests
            </Text>
          </Pressable>

          <Pressable
            style={[styles.navItem, activeSection === 'privacy' && styles.navItemActive]}
            onPress={() => setActiveSection('privacy')}
          >
            <Text style={[styles.navText, activeSection === 'privacy' && styles.navTextActive]}>
              Privacy
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── Right Panel ── */}
      <View style={styles.rightPanel}>
        {activeSection === 'privacy' ? (
          <ScrollView
            contentContainerStyle={styles.rightContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.rightHeading}>Privacy</Text>
            <Text style={styles.rightSub}>Control what friends can see about you</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Hide my location from friends</Text>
                <Text style={styles.toggleDesc}>Friends won't see you on the map</Text>
              </View>
              <Switch
                value={hideLocation}
                onValueChange={setHideLocation}
                trackColor={{ false: '#E0E0E0', true: '#222' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.dividerThin} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Hide quest progress from friends</Text>
                <Text style={styles.toggleDesc}>Friends won't see your completed quests</Text>
              </View>
              <Switch
                value={hideQuestProgress}
                onValueChange={setHideQuestProgress}
                trackColor={{ false: '#E0E0E0', true: '#222' }}
                thumbColor="#fff"
              />
            </View>

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSavePrivacy}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : activeSection === 'profile' ? (
          <ScrollView
            contentContainerStyle={styles.rightContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.rightHeading}>Edit Profile</Text>

            <Text style={styles.fieldLabel}>PROFILE PICTURE URL</Text>
            <TextInput
              style={styles.input}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
            />

            <Text style={styles.fieldLabel}>USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>TOP THING TO EXPLORE</Text>
            <TextInput
              style={styles.input}
              value={topInterest}
              onChangeText={setTopInterest}
              placeholder="e.g. Live music, hiking…"
              returnKeyType="done"
            />

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.rightContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.rightHeading}>My Interests</Text>
            <Text style={styles.rightSub}>
              Pick up to {MAX_CATEGORIES} ({selectedCategories.length}/{MAX_CATEGORIES})
            </Text>

            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              numColumns={5}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <CategoryCard
                  emoji={item.emoji}
                  label={item.label}
                  selected={selectedCategories.includes(item.id)}
                  disabled={atLimit && !selectedCategories.includes(item.id)}
                  onPress={() => toggleCategory(item.id)}
                />
              )}
            />

            {chosenCategories.length > 0 && (
              <>
                <Text style={[styles.rightHeading, styles.subHeading]}>Refine picks</Text>
                {chosenCategories.map((cat) => {
                  const selectedSubs = selectedSubcategories[cat.id] ?? [];
                  return (
                    <View key={cat.id} style={styles.subSection}>
                      <Text style={styles.subSectionTitle}>
                        {cat.emoji} {cat.label}
                      </Text>
                      <ChipGroup
                        options={cat.subcategories}
                        selected={selectedSubs}
                        onToggle={(label) => handleToggleSub(cat.id, label)}
                      />
                    </View>
                  );
                })}
              </>
            )}

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveInterests}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>

            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
  },

  // ── Left panel ──
  leftPanel: {
    width: 185,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#EFEFEF',
  },
  leftContent: {
    paddingTop: 56,
    paddingBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  avatarWrapper: {
    marginBottom: 10,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  leftName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  leftUsername: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  infoLine: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 15,
  },
  navItem: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: '#F3F3F3',
    borderLeftWidth: 3,
    borderLeftColor: '#222',
  },
  navText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#222',
    fontWeight: '700',
  },
  signOutBtn: {
    paddingVertical: 6,
  },
  signOutText: {
    fontSize: 12,
    color: '#AAAAAA',
  },

  // ── Right panel ──
  rightPanel: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  rightContent: {
    padding: 16,
    paddingTop: 56,
  },
  rightHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 15,
    marginTop: 16,
    marginBottom: 8,
  },
  rightSub: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E4E4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#AAAAAA',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  grid: {
    marginBottom: 8,
  },
  subSection: {
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },

  // ── Privacy toggles ──
  dividerThin: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 12,
    color: '#999',
  },
});

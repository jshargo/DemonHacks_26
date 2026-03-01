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
import { colors, spacing, radii, typography } from '@/lib/theme';

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

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [topInterest, setTopInterest] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');

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

      {/* Left Panel */}
      <View style={styles.leftPanel}>
        <ScrollView
          contentContainerStyle={styles.leftContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarWrapper}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
          </View>

          <Text style={styles.leftName} numberOfLines={2}>
            {profile?.display_name ?? profile?.username ?? 'Explorer'}
          </Text>
          {profile?.username && (
            <Text style={styles.leftUsername} numberOfLines={1}>
              @{profile.username}
            </Text>
          )}

          <View style={styles.divider} />

          {profile?.bio && (
            <Text style={styles.infoLine} numberOfLines={2}>{profile.bio}</Text>
          )}
          {memberSince && (
            <Text style={styles.infoLine}>Joined {memberSince}</Text>
          )}

          <View style={styles.divider} />

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

      {/* Right Panel */}
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
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
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
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSavePrivacy}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
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
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>TOP THING TO EXPLORE</Text>
            <TextInput
              style={styles.input}
              value={topInterest}
              onChangeText={setTopInterest}
              placeholder="e.g. Live music, hiking..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
            />

            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
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
                <ActivityIndicator size="small" color={colors.textInverse} />
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
    backgroundColor: colors.surface,
  },

  leftPanel: {
    width: 185,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  leftContent: {
    paddingTop: 56,
    paddingBottom: spacing['2xl'],
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textInverse, fontSize: 26, fontWeight: 'bold' },
  leftName: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  leftUsername: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  infoLine: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 15,
  },
  navItem: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  navText: {
    ...typography.labelMd,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  signOutBtn: {
    paddingVertical: 6,
  },
  signOutText: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },

  rightPanel: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  rightContent: {
    padding: spacing.lg,
    paddingTop: 56,
  },
  rightHeading: {
    ...typography.headingMd,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subHeading: {
    ...typography.bodyMd,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  rightSub: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.textTertiary,
  },
  saveBtnText: {
    ...typography.labelLg,
    fontWeight: '600',
    color: colors.textInverse,
  },
  grid: {
    marginBottom: spacing.sm,
  },
  subSection: {
    marginBottom: spacing.lg,
  },
  subSectionTitle: {
    ...typography.labelMd,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  dividerThin: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },
});

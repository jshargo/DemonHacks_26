// User profile screen — two-panel layout (left nav, right content)
// Owner: Person 1 (Auth + Profiles)

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { supabase } from '@/lib/supabase';
import { CATEGORIES, MAX_CATEGORIES, maxSubsForCategory } from '@/lib/categories';
import { CategoryCard } from '@/components/onboarding/CategoryCard';
import { ChipGroup } from '@/components/onboarding/ChipGroup';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Divider } from '@/components/ui/Divider';
import { Bookmark } from 'lucide-react-native';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

type Section = 'profile' | 'interests' | 'privacy';

function formatMemberSince(dateStr: string | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function ProfileScreen() {
  const router = useRouter();
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

  const displayLabel =
    profile?.display_name ?? profile?.username ?? 'Explorer';

  const memberSince = formatMemberSince(profile?.created_at);
  const chosenCategories = CATEGORIES.filter((c) => selectedCategories.includes(c.id));
  const atLimit = selectedCategories.length >= MAX_CATEGORIES;

  return (
    <View style={styles.root}>

      {/* -- Left Panel -- */}
      <View style={styles.leftPanel}>
        <ScrollView
          contentContainerStyle={styles.leftContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <Avatar
              imageUrl={profile?.avatar_url}
              name={displayLabel}
              size="lg"
            />
          </View>

          {/* Name & username */}
          <Text style={styles.leftName} numberOfLines={2}>
            {displayLabel}
          </Text>
          {profile?.username && (
            <Text style={styles.leftUsername} numberOfLines={1}>
              @{profile.username}
            </Text>
          )}

          {/* XP badge */}
          <View style={styles.xpBadge}>
            <Text style={styles.xpValue}>{(profile?.xp ?? 0).toLocaleString()}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>

          <Divider spacing={spacing.md} />

          {/* Quick info */}
          {profile?.bio && (
            <Text style={styles.infoLine} numberOfLines={2}>{profile.bio}</Text>
          )}
          {memberSince && (
            <Text style={styles.infoLine}>Joined {memberSince}</Text>
          )}

          <Divider spacing={spacing.md} />

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

          <Divider spacing={spacing.md} />

          {/* View Saved link */}
          <Pressable
            style={styles.savedLink}
            onPress={() => router.push('/(tabs)/collections')}
          >
            <Bookmark size={16} color={colors.primary} />
            <Text style={styles.savedLinkText}>View Saved</Text>
          </Pressable>

          <Divider spacing={spacing.md} />

          <Pressable onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* -- Right Panel -- */}
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

            <Button
              title="Save"
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              disabled={saving}
              onPress={handleSavePrivacy}
              style={styles.saveBtn}
            />
          </ScrollView>
        ) : activeSection === 'profile' ? (
          <ScrollView
            contentContainerStyle={styles.rightContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.rightHeading}>Edit Profile</Text>

            <TextInput
              label="PROFILE PICTURE URL"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
              containerStyle={styles.fieldGap}
            />

            <TextInput
              label="DISPLAY NAME"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              containerStyle={styles.fieldGap}
            />

            <TextInput
              label="USERNAME"
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              autoCapitalize="none"
              containerStyle={styles.fieldGap}
            />

            <TextInput
              label="TOP THING TO EXPLORE"
              value={topInterest}
              onChangeText={setTopInterest}
              placeholder="e.g. Live music, hiking..."
              returnKeyType="done"
              containerStyle={styles.fieldGap}
            />

            <Button
              title="Save"
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              disabled={saving}
              onPress={handleSaveProfile}
              style={styles.saveBtn}
            />
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

            <Button
              title="Save"
              variant="primary"
              size="lg"
              fullWidth
              loading={saving}
              disabled={saving}
              onPress={handleSaveInterests}
              style={styles.saveBtn}
            />

            <View style={{ height: spacing['2xl'] }} />
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

  // -- Left panel --
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
    paddingHorizontal: spacing.sm + 2,
  },
  avatarWrapper: {
    marginBottom: spacing.sm + 2,
  },
  leftName: {
    ...typography.labelMd,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  leftUsername: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  xpValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C63FF',
  },
  infoLine: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 15,
  },
  navItem: {
    width: '100%',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
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
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  navTextActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  savedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  savedLinkText: {
    ...typography.labelMd,
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  signOutBtn: {
    paddingVertical: spacing.sm - 2,
  },
  signOutText: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },

  // -- Right panel --
  rightPanel: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  rightContent: {
    padding: spacing.lg,
    paddingTop: 56,
  },
  rightHeading: {
    ...typography.headingLg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subHeading: {
    ...typography.headingSm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  rightSub: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  fieldGap: {
    marginTop: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.xl,
  },
  grid: {
    marginBottom: spacing.sm,
  },
  subSection: {
    marginBottom: spacing.lg,
  },
  subSectionTitle: {
    ...typography.labelLg,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  // -- Privacy toggles --
  dividerThin: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.labelLg,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },
});

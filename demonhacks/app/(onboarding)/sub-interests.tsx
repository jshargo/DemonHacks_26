import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES, maxSubsForCategory } from '@/lib/categories';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { ChipGroup } from '@/components/onboarding/ChipGroup';
import { colors, spacing, radii, typography } from '@/lib/theme';

export default function SubInterestsScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { selectedCategories, selectedSubcategories, setSubInterests, completeOnboarding } =
    usePreferencesStore();
  const { session } = useAuthStore();

  const chosenCategories = CATEGORIES.filter((c) => selectedCategories.includes(c.id));

  const handleToggle = (categoryId: string, label: string) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId)!;
    const limit = maxSubsForCategory(cat);
    const current = selectedSubcategories[categoryId] ?? [];
    const exists = current.includes(label);
    const next = exists
      ? current.filter((x) => x !== label)
      : [...current, label].slice(0, limit);
    setSubInterests(categoryId, next);
  };

  const handleFinish = async () => {
    setSaving(true);
    const userId = session?.user.id;
    if (userId) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        const meta = session?.user?.user_metadata ?? {};
        const username =
          meta.username ??
          session?.user?.email?.split('@')[0] ??
          'user_' + userId.slice(0, 8);
        const { error: createError } = await supabase.from('profiles').insert({
          id: userId,
          username,
          display_name: meta.display_name ?? username,
        });
        if (createError) {
          console.error('Failed to create profile:', createError.message);
          setSaving(false);
          return;
        }
      }

      const { error: prefsError } = await supabase.from('user_onboarding_preferences').upsert({
        user_id: userId,
        selected_categories: selectedCategories,
        selected_subcategories: selectedSubcategories,
        updated_at: new Date().toISOString(),
      });
      if (prefsError) console.error('Failed to save preferences:', prefsError.message);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      if (profileError) console.error('Failed to update profile:', profileError.message);
    }
    completeOnboarding();
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </Pressable>
          <Text style={styles.heading}>Tell us more</Text>
          <Text style={styles.subheading}>Pick subcategories per interest — all optional</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {chosenCategories.map((category) => {
            const selectedSubs = selectedSubcategories[category.id] ?? [];
            const limit = maxSubsForCategory(category);
            const atSubLimit = selectedSubs.length >= limit;

            return (
              <View key={category.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {category.emoji}{'  '}{category.label}
                  </Text>
                  <Text style={[styles.subCounter, atSubLimit && styles.subCounterAtLimit]}>
                    {selectedSubs.length}/{limit}
                  </Text>
                </View>
                <ChipGroup
                  options={category.subcategories}
                  selected={selectedSubs}
                  onToggle={(label) => handleToggle(category.id, label)}
                />
              </View>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleFinish}
            disabled={saving}
            style={({ pressed }) => [
              styles.finishButton,
              pressed && styles.finishButtonPressed,
            ]}
          >
            <Text style={styles.finishText}>{saving ? 'Saving...' : 'Finish'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.labelLg,
    color: colors.primary,
  },
  heading: {
    ...typography.displayMd,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subheading: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingSm,
    color: colors.textPrimary,
  },
  subCounter: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },
  subCounterAtLimit: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  finishButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  finishButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  finishText: {
    ...typography.headingSm,
    color: colors.textInverse,
  },
});

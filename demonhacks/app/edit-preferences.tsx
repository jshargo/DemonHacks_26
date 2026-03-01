import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES, MAX_CATEGORIES, maxSubsForCategory } from '@/lib/categories';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { CategoryCard } from '@/components/onboarding/CategoryCard';
import { ChipGroup } from '@/components/onboarding/ChipGroup';
import { colors, spacing, radii, typography } from '@/lib/theme';

export default function EditPreferencesScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    selectedCategories,
    selectedSubcategories,
    toggleCategory,
    setSubInterests,
  } = usePreferencesStore();
  const { session } = useAuthStore();

  const atLimit = selectedCategories.length >= MAX_CATEGORIES;
  const chosenCategories = CATEGORIES.filter((c) => selectedCategories.includes(c.id));

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

  const handleSave = async () => {
    setSaving(true);
    const userId = session?.user.id;
    if (userId) {
      const { error } = await supabase.from('user_onboarding_preferences').upsert({
        user_id: userId,
        selected_categories: selectedCategories,
        selected_subcategories: selectedSubcategories,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        Alert.alert('Error saving interests', error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>My Interests</Text>
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
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeading}>What are you into?</Text>
        <Text style={styles.sectionSub}>
          Pick up to {MAX_CATEGORIES} interests ({selectedCategories.length}/{MAX_CATEGORIES})
        </Text>

        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={3}
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
            <Text style={[styles.sectionHeading, styles.subHeadingGap]}>Refine your picks</Text>
            <Text style={styles.sectionSub}>Pick subcategories per interest — all optional</Text>

            {chosenCategories.map((category) => {
              const selectedSubs = selectedSubcategories[category.id] ?? [];
              const limit = maxSubsForCategory(category);
              const atSubLimit = selectedSubs.length >= limit;
              return (
                <View key={category.id} style={styles.subSection}>
                  <View style={styles.subSectionHeader}>
                    <Text style={styles.subSectionTitle}>
                      {category.emoji}{'  '}{category.label}
                    </Text>
                    <Text style={[styles.subCounter, atSubLimit && styles.subCounterAtLimit]}>
                      {selectedSubs.length}/{limit}
                    </Text>
                  </View>
                  <ChipGroup
                    options={category.subcategories}
                    selected={selectedSubs}
                    onToggle={(label) => handleToggleSub(category.id, label)}
                  />
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  sectionHeading: { ...typography.headingLg, color: colors.textPrimary, marginBottom: spacing.xs },
  subHeadingGap: { marginTop: spacing.sm },
  sectionSub: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing.lg },
  grid: { paddingBottom: spacing.sm },
  subSection: { marginBottom: spacing['2xl'] },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subSectionTitle: { ...typography.labelLg, fontWeight: '600', color: colors.textPrimary },
  subCounter: { ...typography.bodySm, color: colors.textTertiary },
  subCounterAtLimit: { color: colors.primary, fontWeight: '600' },
});

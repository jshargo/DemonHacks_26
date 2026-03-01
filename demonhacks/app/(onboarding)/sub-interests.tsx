import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES } from '@/lib/categories';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { ChipGroup } from '@/components/onboarding/ChipGroup';

const MAX_SUBS_PER_CATEGORY = 3;

export default function SubInterestsScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { selectedCategories, selectedSubcategories, setSubInterests, completeOnboarding } =
    usePreferencesStore();
  const { session } = useAuthStore();

  const chosenCategories = CATEGORIES.filter((c) => selectedCategories.includes(c.id));

  const handleToggle = (categoryId: string, label: string) => {
    const current = selectedSubcategories[categoryId] ?? [];
    const exists = current.includes(label);
    const next = exists
      ? current.filter((x) => x !== label)
      : [...current, label].slice(0, MAX_SUBS_PER_CATEGORY);
    setSubInterests(categoryId, next);
  };

  const handleFinish = async () => {
    setSaving(true);
    const userId = session?.user.id;
    if (userId) {
      // Write preferences to Supabase (upsert handles new and returning users)
      await supabase.from('user_onboarding_preferences').upsert({
        user_id: userId,
        selected_categories: selectedCategories,
        selected_subcategories: selectedSubcategories,
        updated_at: new Date().toISOString(),
      });
      // Mark onboarding done on the user profile
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    }
    // Always update local state so AuthGate can redirect even if Supabase is slow
    completeOnboarding();
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.heading}>Tell us more</Text>
          <Text style={styles.subheading}>Pick up to {MAX_SUBS_PER_CATEGORY} per interest — all optional</Text>
        </View>

        {/* Subcategory Sections */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {chosenCategories.map((category) => {
            const selectedSubs = selectedSubcategories[category.id] ?? [];
            const atSubLimit = selectedSubs.length >= MAX_SUBS_PER_CATEGORY;

            return (
              <View key={category.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {category.emoji}{'  '}{category.label}
                  </Text>
                  <Text style={[styles.subCounter, atSubLimit && styles.subCounterAtLimit]}>
                    {selectedSubs.length}/{MAX_SUBS_PER_CATEGORY}
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

          {/* Bottom padding so content clears the footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Finish Button */}
        <View style={styles.footer}>
          <Pressable onPress={handleFinish} disabled={saving} style={styles.finishButton}>
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '400',
    color: '#717171',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  subCounter: {
    fontSize: 12,
    fontWeight: '400',
    color: '#AAAAAA',
  },
  subCounterAtLimit: {
    color: '#222222',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  finishButton: {
    backgroundColor: '#222222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

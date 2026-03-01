import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES, MAX_CATEGORIES } from '@/lib/categories';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { CategoryCard } from '@/components/onboarding/CategoryCard';
import { colors, spacing, radii, typography } from '@/lib/theme';

export default function InterestsScreen() {
  const router = useRouter();
  const { selectedCategories, toggleCategory, skipOnboarding } = usePreferencesStore();
  const { session } = useAuthStore();

  const atLimit = selectedCategories.length >= MAX_CATEGORIES;
  const hasSelection = selectedCategories.length > 0;

  const handleContinue = () => {
    router.push('/(onboarding)/sub-interests');
  };

  const handleSkip = async () => {
    const userId = session?.user.id;
    if (userId) {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
    }
    skipOnboarding();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.heading}>What are you into?</Text>
          <Text style={styles.subheading}>Pick up to {MAX_CATEGORIES} interests</Text>
        </View>

        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={5}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
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

        <View style={styles.footer}>
          <Text style={styles.counter}>
            {selectedCategories.length} / {MAX_CATEGORIES} selected
          </Text>

          <Pressable
            onPress={handleContinue}
            disabled={!hasSelection}
            style={({ pressed }) => [
              styles.continueButton,
              !hasSelection && styles.continueButtonDisabled,
              pressed && hasSelection && styles.continueButtonPressed,
            ]}
          >
            <Text style={[styles.continueText, !hasSelection && styles.continueTextDisabled]}>
              Continue
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
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
    paddingHorizontal: spacing.lg,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
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
  grid: {
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  counter: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  continueText: {
    ...typography.headingSm,
    color: colors.textInverse,
  },
  continueTextDisabled: {
    color: colors.textTertiary,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  skipText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});

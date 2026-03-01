import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES, MAX_CATEGORIES } from '@/lib/categories';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { CategoryCard } from '@/components/onboarding/CategoryCard';

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>What are you into?</Text>
          <Text style={styles.subheading}>Pick up to {MAX_CATEGORIES} interests</Text>
        </View>

        {/* Category Grid */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CategoryCard
              emoji={item.emoji}
              label={item.label}
              selected={selectedCategories.includes(item.id)}
              disabled={atLimit}
              onPress={() => toggleCategory(item.id)}
            />
          )}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.counter}>
            {selectedCategories.length} / {MAX_CATEGORIES} selected
          </Text>

          <Pressable
            onPress={handleContinue}
            disabled={!hasSelection}
            style={[styles.continueButton, !hasSelection && styles.continueButtonDisabled]}
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 4,
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
  grid: {
    paddingBottom: 16,
  },
  footer: {
    paddingBottom: 24,
    paddingHorizontal: 4,
    gap: 12,
  },
  counter: {
    fontSize: 13,
    fontWeight: '400',
    color: '#717171',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#222222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#DDDDDD',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueTextDisabled: {
    color: '#B0B0B0',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#717171',
    textDecorationLine: 'underline',
  },
});

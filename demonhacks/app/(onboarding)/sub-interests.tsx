import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES } from '@/lib/categories';
import { usePreferencesStore } from '@/stores/preferences-store';
import { SubcategoryChip } from '@/components/onboarding/SubcategoryChip';

export default function SubInterestsScreen() {
  const router = useRouter();
  const { selectedCategories, selectedSubcategories, toggleSubcategory, completeOnboarding } =
    usePreferencesStore();

  const chosenCategories = CATEGORIES.filter((c) => selectedCategories.includes(c.id));

  const handleFinish = () => {
    completeOnboarding();
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
          <Text style={styles.subheading}>Fine-tune your picks — all optional</Text>
        </View>

        {/* Subcategory Sections */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {chosenCategories.map((category) => (
            <View key={category.id} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {category.emoji}{'  '}{category.label}
              </Text>
              <View style={styles.chipsRow}>
                {category.subcategories.map((sub) => (
                  <SubcategoryChip
                    key={sub}
                    label={sub}
                    selected={(selectedSubcategories[category.id] ?? []).includes(sub)}
                    onPress={() => toggleSubcategory(category.id, sub)}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* Bottom padding so content clears the footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Finish Button */}
        <View style={styles.footer}>
          <Pressable onPress={handleFinish} style={styles.finishButton}>
            <Text style={styles.finishText}>Finish</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
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

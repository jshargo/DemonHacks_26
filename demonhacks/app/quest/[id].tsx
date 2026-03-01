import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuestById } from '@/hooks/useQuests';
import { colors, spacing, radii, shadows, typography } from '@/lib/theme';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.error,
};

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quest } = useQuestById(id);

  if (!quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Quest not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{quest.name}</Text>

      <View style={styles.meta}>
        <Text
          style={[
            styles.badge,
            { backgroundColor: DIFFICULTY_COLORS[quest.difficulty] ?? colors.textTertiary },
          ]}
        >
          {quest.difficulty}
        </Text>
        <Text style={styles.metaText}>{quest.estimated_time}</Text>
        <Text style={styles.metaText}>{quest.stops.length} stops</Text>
      </View>

      <Text style={styles.description}>{quest.description}</Text>

      <Text style={styles.sectionTitle}>Stops</Text>

      {quest.stops.map((stop) => (
        <View key={stop.stop_order} style={styles.stopCard}>
          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>{stop.stop_order}</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName}>{stop.spot_name}</Text>
            <Text style={styles.stopHint}>{stop.hint}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  title: { ...typography.displayMd, color: colors.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 10 },
  badge: {
    ...typography.labelMd,
    color: colors.textInverse,
    textTransform: 'capitalize',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  metaText: { ...typography.bodyMd, color: colors.textSecondary },
  description: { ...typography.bodyLg, color: colors.textSecondary, marginTop: 14, lineHeight: 22 },
  sectionTitle: { ...typography.headingLg, color: colors.textPrimary, marginTop: spacing['2xl'], marginBottom: spacing.md },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    marginBottom: 10,
    ...shadows.card,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stopNumberText: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },
  stopInfo: { flex: 1 },
  stopName: { ...typography.headingSm, color: colors.textPrimary },
  stopHint: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 18 },
  empty: { ...typography.bodyMd, color: colors.textTertiary, textAlign: 'center', marginTop: spacing['4xl'] },
});

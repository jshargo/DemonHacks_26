import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuestById, type LocalQuestStop } from '@/hooks/useQuests';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.error,
};

const CATEGORY_LABELS: Record<string, string> = {
  food_drink: 'Food & Drink',
  outdoors: 'Outdoors',
  entertainment: 'Entertainment',
  arts_culture: 'Arts & Culture',
  shopping: 'Shopping',
  volunteering: 'Volunteering',
  other: 'Other',
};

function StopTimelineItem({
  stop,
  isLast,
  diffColor,
}: {
  stop: LocalQuestStop;
  isLast: boolean;
  diffColor: string;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.timelineNumber}>{stop.stop_order}</Text>
        </View>
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.primary + '30' }]} />}
      </View>

      <View style={styles.timelineCard}>
        <View style={styles.timelineCardHeader}>
          <Text style={styles.stopName} numberOfLines={1}>{stop.spot_name}</Text>
          <View style={styles.stopXpBadge}>
            <Text style={styles.stopXpText}>+{stop.xp_reward} XP</Text>
          </View>
        </View>

        {stop.address && (
          <Text style={styles.stopAddress}>{stop.address}</Text>
        )}

        {stop.category && (
          <View style={styles.stopCategoryBadge}>
            <Text style={styles.stopCategoryText}>
              {CATEGORY_LABELS[stop.category] ?? stop.category}
            </Text>
          </View>
        )}

        <Text style={styles.stopHint}>{stop.hint}</Text>
      </View>
    </View>
  );
}

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quest, totalXp } = useQuestById(id);

  if (!quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Quest not found.</Text>
      </View>
    );
  }

  const diffColor = DIFFICULTY_COLORS[quest.difficulty] ?? colors.textTertiary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero header */}
      <View style={[styles.hero, { backgroundColor: diffColor + '15' }]}>
        <Text style={[styles.heroBadge, { backgroundColor: diffColor }]}>
          {quest.difficulty.toUpperCase()}
        </Text>
        <Text style={styles.heroTitle}>{quest.name}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalXp}</Text>
          <Text style={styles.statLabel}>XP Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{quest.estimated_time}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{quest.stops.length}</Text>
          <Text style={styles.statLabel}>Stops</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{quest.description}</Text>

      {/* Stops section */}
      <Text style={styles.stopsTitle}>Stops</Text>

      {quest.stops
        .slice()
        .sort((a, b) => a.stop_order - b.stop_order)
        .map((stop, index) => (
          <StopTimelineItem
            key={stop.stop_order}
            stop={stop}
            isLast={index === quest.stops.length - 1}
            diffColor={diffColor}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },

  // Hero
  hero: {
    padding: spacing['2xl'],
    paddingTop: spacing.lg,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    ...typography.caption,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    letterSpacing: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm - 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.displayLg,
    color: colors.textPrimary,
    lineHeight: 34,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.headingMd,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.bodySm,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // Description
  description: {
    ...typography.bodyLg,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Stops
  stopsTitle: {
    ...typography.headingLg,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
    marginBottom: spacing.lg,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: spacing.md,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNumber: {
    color: colors.textInverse,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: spacing.xs,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm - 2,
  },
  stopName: {
    ...typography.headingSm,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  stopXpBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  stopXpText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  stopAddress: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  stopCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm - 2,
    marginBottom: spacing.sm - 2,
  },
  stopCategoryText: {
    ...typography.caption,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  stopHint: {
    ...typography.bodyMd,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  empty: {
    ...typography.bodyMd,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
});

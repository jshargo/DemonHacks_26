import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuestById, type LocalQuestStop } from '@/hooks/useQuests';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';
import { useQuestProgress, type StopProgress } from '@/hooks/useQuestProgress';

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

function ProgressBar({
  completed,
  total,
  color,
}: {
  completed: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {completed}/{total} stops completed
        </Text>
        <Text style={[styles.progressPct, { color }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function StopTimelineItem({
  stop,
  isLast,
  diffColor,
  progress,
  onCheckIn,
  checkingIn,
}: {
  stop: LocalQuestStop;
  isLast: boolean;
  diffColor: string;
  progress: StopProgress | undefined;
  onCheckIn: () => void;
  checkingIn: boolean;
}) {
  const completed = progress?.completed ?? false;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.timelineCircle,
            { backgroundColor: completed ? '#00C49A' : diffColor },
          ]}
        >
          {completed ? (
            <Text style={styles.checkMark}>{'\u2713'}</Text>
          ) : (
            <Text style={styles.timelineNumber}>{stop.stop_order}</Text>
          )}
        </View>
        {!isLast && (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: completed ? '#00C49A30' : diffColor + '30' },
            ]}
          />
        )}
      </View>

      <View style={[styles.timelineCard, completed && styles.timelineCardCompleted]}>
        <View style={styles.timelineCardHeader}>
          <Text
            style={[styles.stopName, completed && styles.stopNameCompleted]}
            numberOfLines={1}
          >
            {stop.spot_name}
          </Text>
          <View
            style={[
              styles.stopXpBadge,
              completed && styles.stopXpBadgeCompleted,
            ]}
          >
            <Text
              style={[
                styles.stopXpText,
                completed && styles.stopXpTextCompleted,
              ]}
            >
              {completed ? '\u2713 ' : '+'}
              {stop.xp_reward} XP
            </Text>
          </View>
        </View>

        {stop.address && <Text style={styles.stopAddress}>{stop.address}</Text>}

        {stop.category && (
          <View style={styles.stopCategoryBadge}>
            <Text style={styles.stopCategoryText}>
              {CATEGORY_LABELS[stop.category] ?? stop.category}
            </Text>
          </View>
        )}

        <Text style={styles.stopHint}>{stop.hint}</Text>

        {/* Check-in button */}
        {!completed && (
          <Pressable
            style={[styles.checkInBtn, checkingIn && styles.checkInBtnDisabled]}
            onPress={onCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.checkInBtnText}>Check In</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function QuestCompleteBanner({
  questName,
  bonusXp,
  totalXpEarned,
  alreadyClaimed,
  onClaim,
}: {
  questName: string;
  bonusXp: number;
  totalXpEarned: number;
  alreadyClaimed: boolean;
  onClaim: () => void;
}) {
  return (
    <View style={styles.completeBanner}>
      <Text style={styles.completeEmoji}>{'\uD83C\uDF89'}</Text>
      <Text style={styles.completeTitle}>Quest Complete!</Text>
      <Text style={styles.completeSubtitle}>
        You finished {questName}
      </Text>
      <Text style={styles.completeXp}>
        {totalXpEarned} XP earned from stops
      </Text>

      {alreadyClaimed ? (
        <View style={styles.claimedBadge}>
          <Text style={styles.claimedText}>
            {'\u2713'} +{bonusXp} XP Bonus Claimed
          </Text>
        </View>
      ) : (
        <Pressable style={styles.claimBtn} onPress={onClaim}>
          <Text style={styles.claimBtnText}>
            Claim +{bonusXp} XP Bonus
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quest, totalXp } = useQuestById(id);
  const {
    stopProgress,
    completedCount,
    totalStops,
    allStopsComplete,
    questCompleted,
    loading,
    checkingIn,
    checkInStop,
    claimQuestReward,
    xpEarned,
  } = useQuestProgress(quest);

  const [claimingReward, setClaimingReward] = useState(false);

  if (!quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Quest not found.</Text>
      </View>
    );
  }

  const diffColor = DIFFICULTY_COLORS[quest.difficulty] ?? colors.textTertiary;

  const handleCheckIn = async (stopOrder: number) => {
    const ok = await checkInStop(stopOrder);
    if (!ok) {
      Alert.alert('Check-in failed', 'Could not check in at this stop. Please try again.');
    }
  };

  const handleClaimReward = async () => {
    setClaimingReward(true);
    const ok = await claimQuestReward();
    setClaimingReward(false);
    if (!ok) {
      Alert.alert('Error', 'Could not claim quest reward. Please try again.');
    }
  };

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
          <Text style={styles.statValue}>
            {completedCount}/{quest.stops.length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Progress bar */}
      {!loading && totalStops > 0 && (
        <ProgressBar completed={completedCount} total={totalStops} color={diffColor} />
      )}

      {/* Quest complete banner */}
      {allStopsComplete && (
        <QuestCompleteBanner
          questName={quest.name}
          bonusXp={quest.xp_reward}
          totalXpEarned={xpEarned}
          alreadyClaimed={questCompleted}
          onClaim={handleClaimReward}
        />
      )}

      {/* Description */}
      <Text style={styles.description}>{quest.description}</Text>

      {/* Stops section */}
      <View style={styles.stopsTitleRow}>
        <Text style={styles.stopsTitle}>Stops</Text>
        {xpEarned > 0 && (
          <Text style={styles.xpEarnedLabel}>{xpEarned} XP earned</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={diffColor} />
          <Text style={styles.loadingText}>Loading progress...</Text>
        </View>
      ) : (
        quest.stops
          .slice()
          .sort((a, b) => a.stop_order - b.stop_order)
          .map((stop, index) => (
            <StopTimelineItem
              key={stop.stop_order}
              stop={stop}
              isLast={index === quest.stops.length - 1}
              diffColor={diffColor}
              progress={stopProgress.find((sp) => sp.stopOrder === stop.stop_order)}
              onCheckIn={() => handleCheckIn(stop.stop_order)}
              checkingIn={checkingIn}
            />
          ))
      )}
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

  // Progress bar
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Quest complete banner
  completeBanner: {
    margin: 16,
    padding: 24,
    backgroundColor: '#F0FFF4',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00C49A40',
  },
  completeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  completeSubtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
  },
  completeXp: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C49A',
    marginBottom: 16,
  },
  claimBtn: {
    backgroundColor: '#00C49A',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  claimedBadge: {
    backgroundColor: '#00C49A20',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  claimedText: {
    color: '#00C49A',
    fontSize: 15,
    fontWeight: '700',
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
  stopsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  stopsTitle: {
    ...typography.headingLg,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  xpEarnedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
  checkMark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
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
  timelineCardCompleted: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#00C49A30',
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
  stopNameCompleted: {
    color: '#00C49A',
  },
  stopXpBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  stopXpBadgeCompleted: {
    backgroundColor: '#00C49A20',
  },
  stopXpText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  stopXpTextCompleted: {
    color: '#00C49A',
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

  // Check-in button
  checkInBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  checkInBtnDisabled: {
    opacity: 0.6,
  },
  checkInBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  empty: {
    ...typography.bodyMd,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
});

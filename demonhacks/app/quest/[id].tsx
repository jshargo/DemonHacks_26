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
import { useQuestProgress, type StopProgress } from '@/hooks/useQuestProgress';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#00C49A',
  medium: '#F77F00',
  hard: '#E63946',
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

  const diffColor = DIFFICULTY_COLORS[quest.difficulty] ?? '#888';

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
          <Text style={[styles.statValue, { color: '#6C63FF' }]}>{totalXp}</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },

  // Hero
  hero: {
    padding: 24,
    paddingTop: 16,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
    lineHeight: 34,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E5E5',
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
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
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
    paddingHorizontal: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: 12,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  timelineNumber: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    marginBottom: 6,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  stopNameCompleted: {
    color: '#00C49A',
  },
  stopXpBadge: {
    backgroundColor: '#6C63FF15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stopXpBadgeCompleted: {
    backgroundColor: '#00C49A20',
  },
  stopXpText: {
    color: '#6C63FF',
    fontSize: 11,
    fontWeight: '700',
  },
  stopXpTextCompleted: {
    color: '#00C49A',
  },
  stopAddress: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  stopCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  stopCategoryText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  stopHint: {
    fontSize: 13,
    color: '#777',
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

  empty: { fontSize: 15, color: '#999', textAlign: 'center', marginTop: 40 },
});

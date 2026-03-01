import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuestById, type LocalQuestStop } from '@/hooks/useQuests';

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
        <View style={[styles.timelineCircle, { backgroundColor: diffColor }]}>
          <Text style={styles.timelineNumber}>{stop.stop_order}</Text>
        </View>
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: diffColor + '30' }]} />}
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

  const diffColor = DIFFICULTY_COLORS[quest.difficulty] ?? '#888';

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

  // Description
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Stops
  stopsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
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
  stopXpBadge: {
    backgroundColor: '#6C63FF15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stopXpText: {
    color: '#6C63FF',
    fontSize: 11,
    fontWeight: '700',
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

  empty: { fontSize: 15, color: '#999', textAlign: 'center', marginTop: 40 },
});

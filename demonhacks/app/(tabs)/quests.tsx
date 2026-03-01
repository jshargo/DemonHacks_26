import { View, Text, SectionList, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuests, type LocalQuest, type DifficultySection } from '@/hooks/useQuests';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#00C49A',
  medium: '#F77F00',
  hard: '#E63946',
};

function DifficultyHeader({ section }: { section: DifficultySection }) {
  const color = DIFFICULTY_COLORS[section.difficulty];
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{section.label}</Text>
      <Text style={styles.sectionCount}>{section.data.length} quest{section.data.length !== 1 ? 's' : ''}</Text>
    </View>
  );
}

function QuestCard({ quest, onPress }: { quest: LocalQuest; onPress: () => void }) {
  const diffColor = DIFFICULTY_COLORS[quest.difficulty] ?? '#888';
  const totalXp = quest.xp_reward + quest.stops.reduce((sum, s) => sum + (s.xp_reward || 0), 0);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardStripe, { backgroundColor: diffColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>{quest.name}</Text>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>{totalXp} XP</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <Text style={[styles.diffBadge, { backgroundColor: diffColor }]}>
            {quest.difficulty}
          </Text>
          <Text style={styles.metaText}>{quest.estimated_time}</Text>
          <Text style={styles.metaDot}>{'\u00B7'}</Text>
          <Text style={styles.metaText}>{quest.stops.length} stops</Text>
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>{quest.description}</Text>
      </View>
    </Pressable>
  );
}

export default function QuestsScreen() {
  const { sections } = useQuests();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quests</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <DifficultyHeader section={section as DifficultySection} />
        )}
        renderItem={({ item }) => (
          <QuestCard
            quest={item}
            onPress={() => router.push(`/quest/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111' },
  list: { paddingBottom: 24 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  sectionAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },

  // Quest card
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardStripe: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  xpBadge: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  diffBadge: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  metaText: {
    fontSize: 13,
    color: '#888',
  },
  metaDot: {
    fontSize: 13,
    color: '#ccc',
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

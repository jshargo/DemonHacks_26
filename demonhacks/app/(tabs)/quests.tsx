import { View, Text, SectionList, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuests, type LocalQuest, type DifficultySection } from '@/hooks/useQuests';
import { colors, fonts, typography, spacing, radii, shadows } from '@/lib/theme';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.error,
};

function DifficultyHeader({ section }: { section: DifficultySection }) {
  const color = DIFFICULTY_COLORS[section.difficulty];
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{section.label}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length} quest{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

function QuestCard({ quest, onPress }: { quest: LocalQuest; onPress: () => void }) {
  const diffColor = DIFFICULTY_COLORS[quest.difficulty] ?? colors.textTertiary;
  const totalXp = quest.xp_reward + quest.stops.reduce((sum, s) => sum + (s.xp_reward || 0), 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
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
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    ...typography.displaySm,
    color: colors.textPrimary,
  },
  list: { paddingBottom: spacing['2xl'] },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  sectionAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  sectionTitle: {
    ...typography.headingLg,
    color: colors.textPrimary,
    flex: 1,
  },
  sectionCount: {
    ...typography.labelMd,
    color: colors.textTertiary,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  cardStripe: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardName: {
    ...typography.headingMd,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  xpBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  xpBadgeText: {
    color: colors.textInverse,
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  diffBadge: {
    fontSize: 11,
    color: colors.textInverse,
    fontFamily: fonts.bold,
    textTransform: 'capitalize',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textTertiary,
  },
  metaDot: {
    ...typography.bodySm,
    color: colors.border,
  },
  cardDesc: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
});

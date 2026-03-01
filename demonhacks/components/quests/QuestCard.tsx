import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

interface QuestCardQuest {
  title: string;
  difficulty?: string;
  estimated_time?: string | null;
  description?: string | null;
}

interface QuestCardProps {
  quest: QuestCardQuest;
  completedStops?: number;
  totalStops?: number;
  onPress: (quest: QuestCardQuest) => void;
}

export default function QuestCard({ quest, completedStops, totalStops, onPress }: QuestCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(quest)}
    >
      <Text style={styles.title}>{quest.title}</Text>
      <View style={styles.meta}>
        <Text style={styles.difficulty}>{quest.difficulty}</Text>
        {quest.estimated_time && (
          <Text style={styles.time}>{quest.estimated_time}</Text>
        )}
      </View>
      {quest.description && <Text style={styles.desc}>{quest.description}</Text>}
      {totalStops != null && (
        <Text style={styles.progress}>
          {completedStops ?? 0}/{totalStops} stops completed
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.headingMd,
    color: colors.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  difficulty: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  desc: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  progress: {
    ...typography.bodySm,
    color: colors.success,
    marginTop: spacing.sm,
    fontFamily: fonts.medium,
  },
});

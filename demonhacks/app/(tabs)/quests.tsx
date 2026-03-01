import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuests, type LocalQuest } from '@/hooks/useQuests';
import { colors, spacing, radii, shadows, typography } from '@/lib/theme';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.error,
};

export default function QuestsScreen() {
  const { quests } = useQuests();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <FlatList
        data={quests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: LocalQuest }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/quest/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.meta}>
              <Text
                style={[
                  styles.badge,
                  { backgroundColor: DIFFICULTY_COLORS[item.difficulty] ?? colors.textTertiary },
                ]}
              >
                {item.difficulty}
              </Text>
              <Text style={styles.time}>{item.estimated_time}</Text>
              <Text style={styles.stops}>{item.stops.length} stops</Text>
            </View>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  name: {
    ...typography.headingMd,
    color: colors.textPrimary,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  badge: {
    ...typography.labelMd,
    color: colors.textInverse,
    textTransform: 'capitalize',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  time: { ...typography.bodySm, color: colors.textSecondary },
  stops: { ...typography.bodySm, color: colors.textTertiary },
  desc: { ...typography.bodyMd, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
});

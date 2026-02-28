// Quest card for quest list view
// Owner: Person 3 (Quests + Check-ins)

import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Quest } from '@/lib/types';

interface QuestCardProps {
  quest: Quest;
  completedStops?: number;
  totalStops?: number;
  onPress: (quest: Quest) => void;
}

export default function QuestCard({ quest, completedStops, totalStops, onPress }: QuestCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(quest)}>
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
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600' },
  meta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  difficulty: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  time: { fontSize: 12, color: '#999' },
  desc: { fontSize: 14, color: '#555', marginTop: 6 },
  progress: { fontSize: 12, color: '#00C49A', marginTop: 6, fontWeight: '500' },
});

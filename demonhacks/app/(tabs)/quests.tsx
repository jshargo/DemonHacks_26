import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuests, type LocalQuest } from '@/hooks/useQuests';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#00C49A',
  medium: '#F77F00',
  hard: '#E63946',
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
            style={styles.card}
            onPress={() => router.push(`/quest/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.meta}>
              <Text
                style={[
                  styles.badge,
                  { backgroundColor: DIFFICULTY_COLORS[item.difficulty] ?? '#888' },
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
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  time: { fontSize: 13, color: '#666' },
  stops: { fontSize: 13, color: '#999' },
  desc: { fontSize: 14, color: '#555', marginTop: 8, lineHeight: 20 },
});

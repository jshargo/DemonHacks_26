import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuestById } from '@/hooks/useQuests';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#00C49A',
  medium: '#F77F00',
  hard: '#E63946',
};

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quest } = useQuestById(id);

  if (!quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Quest not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{quest.name}</Text>

      <View style={styles.meta}>
        <Text
          style={[
            styles.badge,
            { backgroundColor: DIFFICULTY_COLORS[quest.difficulty] ?? '#888' },
          ]}
        >
          {quest.difficulty}
        </Text>
        <Text style={styles.metaText}>{quest.estimated_time}</Text>
        <Text style={styles.metaText}>{quest.stops.length} stops</Text>
      </View>

      <Text style={styles.description}>{quest.description}</Text>

      <Text style={styles.sectionTitle}>Stops</Text>

      {quest.stops.map((stop) => (
        <View key={stop.stop_order} style={styles.stopCard}>
          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>{stop.stop_order}</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName}>{stop.spot_name}</Text>
            <Text style={styles.stopHint}>{stop.hint}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: 'bold' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
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
  metaText: { fontSize: 14, color: '#666' },
  description: { fontSize: 15, color: '#444', marginTop: 14, lineHeight: 22 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9B5DE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: '600' },
  stopHint: { fontSize: 13, color: '#777', marginTop: 4, lineHeight: 18 },
  empty: { fontSize: 15, color: '#999', textAlign: 'center', marginTop: 40 },
});

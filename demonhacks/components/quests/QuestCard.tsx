// Event card — replaces QuestCard since quests aren't in the real schema
// Owner: Person 3

import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Event } from '@/lib/types';

interface QuestCardProps {
  event: Event;
  onPress: (event: Event) => void;
}

export default function QuestCard({ event, onPress }: QuestCardProps) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(event)}>
      <Text style={styles.name}>{event.name}</Text>
      {event.type && <Text style={styles.type}>{event.type}</Text>}
      {event.venue_name && <Text style={styles.venue}>{event.venue_name}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 18, fontWeight: '600' },
  type: { fontSize: 12, color: '#666', marginTop: 4, textTransform: 'capitalize' },
  venue: { fontSize: 12, color: '#999', marginTop: 2 },
});

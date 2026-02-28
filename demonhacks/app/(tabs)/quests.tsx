// Events screen — shows upcoming events from Supabase
// The "Quests" tab now shows real events from the events table

import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useEvents } from '@/hooks/useEvents';
import type { Event } from '@/lib/types';

export default function EventsScreen() {
  const { events, loading, error } = useEvents({ upcomingOnly: false });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {loading && <Text style={styles.empty}>Loading events...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && events.length === 0 && (
        <Text style={styles.empty}>No events found. Add some to your Supabase events table!</Text>
      )}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Event }) => (
          <Pressable style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {item.venue_name && <Text style={styles.venue}>{item.venue_name}</Text>}
            <Text style={styles.time}>{formatDate(item.time_start)}</Text>
            {item.type && <Text style={styles.type}>{item.type}</Text>}
            {item.description && (
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            )}
            {item.attending_count > 0 && (
              <Text style={styles.attending}>{item.attending_count} attending</Text>
            )}
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
  venue: { fontSize: 14, color: '#444', marginTop: 2 },
  time: { fontSize: 13, color: '#9B5DE5', marginTop: 4, fontWeight: '500' },
  type: { fontSize: 12, color: '#666', marginTop: 2, textTransform: 'capitalize' },
  desc: { fontSize: 13, color: '#777', marginTop: 6 },
  attending: { fontSize: 12, color: '#00C49A', marginTop: 6, fontWeight: '500' },
  empty: { fontSize: 15, color: '#999', marginTop: 24, textAlign: 'center', padding: 16 },
  error: { fontSize: 14, color: '#e74c3c', textAlign: 'center', padding: 16 },
});

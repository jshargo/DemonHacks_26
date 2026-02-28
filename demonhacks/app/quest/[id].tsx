// TODO: Quest detail screen
// Owner: Person 3 (Quests + Check-ins)
// - Map showing the route with numbered stop markers
// - List of stops with completion status
// - Check-in button for current stop
// - Progress indicator

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quest Detail</Text>
      <Text style={styles.id}>Quest ID: {id}</Text>
      {/* TODO: Fetch quest data, render QuestRoute + QuestStopItem list */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  id: { fontSize: 14, color: '#666', marginTop: 4 },
});

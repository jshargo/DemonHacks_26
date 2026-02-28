// TODO: Spot detail screen (deep link target)
// Owner: Person 2 (Map + Spots)
// - Full spot details: name, description, image, address, website
// - Save button, directions button, share button
// - Map preview showing spot location
// - Related quests that include this spot

import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function SpotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spot Detail</Text>
      <Text style={styles.id}>Spot ID: {id}</Text>
      {/* TODO: Fetch spot data from Supabase */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
  id: { fontSize: 14, color: '#666', marginTop: 4 },
});

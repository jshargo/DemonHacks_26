// TODO: Advanced filter modal/drawer
// Owner: Person 2 (Map + Spots)
// - Accessible via filter icon on map screen
// - Supports subcategory, tags, and metadata-based filtering
// - Apply/reset buttons

import { View, Text, StyleSheet } from 'react-native';

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function FilterDrawer({ visible, onClose }: FilterDrawerProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filters</Text>
      {/* TODO: subcategory filters, tag filters */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
});

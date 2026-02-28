// TODO: Mapbox map wrapper component
// Owner: Person 2 (Map + Spots)
// - Renders react-map-gl Map component
// - Applies Chicago bounds and default viewport
// - Handles viewport changes via map store
// - Renders MapPin components for each visible spot

import { View, Text, StyleSheet } from 'react-native';

export default function MapViewComponent() {
  return (
    <View style={styles.container}>
      <Text>MapView — TODO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

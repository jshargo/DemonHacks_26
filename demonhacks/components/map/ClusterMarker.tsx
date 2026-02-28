// TODO: Cluster marker for grouped pins at low zoom
// Owner: Person 2 (Map + Spots)
// - Shows count of spots in cluster
// - Styled circle with number

import { View, Text, StyleSheet } from 'react-native';

interface ClusterMarkerProps {
  count: number;
  onPress: () => void;
}

export default function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  return (
    <View style={styles.cluster}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

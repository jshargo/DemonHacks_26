// Map pin component
// Owner: Person 2 (Map + Spots)

import { View, StyleSheet, Pressable } from 'react-native';
import { ENTITY_TYPES } from '@/lib/constants';
import type { MapPin as MapPinType } from '@/lib/types';

interface MapPinProps {
  pin: MapPinType;
  onPress: (pin: MapPinType) => void;
}

export default function MapPin({ pin, onPress }: MapPinProps) {
  return (
    <Pressable onPress={() => onPress(pin)}>
      <View
        style={[
          styles.pin,
          { backgroundColor: ENTITY_TYPES[pin.entityType]?.color ?? '#333' },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pin: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#fff' },
});

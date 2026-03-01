import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { SharedSpotMetadata } from '@/lib/types';

interface Props {
  metadata: SharedSpotMetadata;
  type: 'spot' | 'event';
  isMe: boolean;
}

export function SpotShareCard({ metadata, type, isMe }: Props) {
  return (
    <View style={[styles.card, isMe ? styles.cardMe : styles.cardThem]}>
      {metadata.imageUrl ? (
        <Image source={{ uri: metadata.imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderIcon}>{type === 'event' ? '🗓' : '📍'}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.label}>{type === 'event' ? 'Event' : 'Spot'}</Text>
        <Text style={styles.name} numberOfLines={2}>{metadata.name}</Text>
        {metadata.address && (
          <Text style={styles.address} numberOfLines={1}>{metadata.address}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    width: 240,
    borderWidth: 1,
  },
  cardMe: { borderColor: '#9B94FF', backgroundColor: '#EEF' },
  cardThem: { borderColor: '#E0E0E0', backgroundColor: '#FFF' },
  image: { width: '100%', height: 110 },
  imagePlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 36 },
  info: { padding: 10 },
  label: { fontSize: 11, color: '#6C63FF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  name: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  address: { fontSize: 12, color: '#888' },
});

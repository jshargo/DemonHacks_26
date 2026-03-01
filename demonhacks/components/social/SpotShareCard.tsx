import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import type { SharedSpotMetadata, DiscoverItem } from '@/lib/types';
import { useExploreStore } from '@/stores/explore-store';

interface Props {
  metadata: SharedSpotMetadata;
  type: 'spot' | 'event';
  isMe: boolean;
}

export function SpotShareCard({ metadata, type, isMe }: Props) {
  const openDetail = useExploreStore((s) => s.openDetail);

  const handlePress = () => {
    const item: DiscoverItem = {
      id: metadata.id,
      entityType: type === 'event' ? 'event' : 'place',
      name: metadata.name,
      lat: metadata.lat,
      lng: metadata.lng,
      category: null,
      subcategory: metadata.category,
      description: null,
      imageUrl: metadata.imageUrl,
      neighborhood: metadata.address ?? '',
      rating: null,
      priceRange: null,
      tags: [],
      startsAt: null,
      endsAt: null,
      venueName: null,
      attendingCount: null,
      websiteUrl: null,
      placeFormatted: metadata.address ?? undefined,
    };
    openDetail(item);
    router.navigate('/(tabs)');
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={[styles.card, isMe ? styles.cardMe : styles.cardThem]}>
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
        {!!metadata.address && (
          <Text style={styles.address} numberOfLines={1}>{metadata.address}</Text>
        )}
      </View>
    </TouchableOpacity>
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

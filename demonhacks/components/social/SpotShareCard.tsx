import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { SharedSpotMetadata } from '@/lib/types';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

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
    borderRadius: radii.lg,
    overflow: 'hidden',
    width: 240,
    borderWidth: 1,
  },
  cardMe: { borderColor: colors.primary + '66', backgroundColor: colors.primaryLight },
  cardThem: { borderColor: colors.border, backgroundColor: colors.white },
  image: { width: '100%', height: 110 },
  imagePlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 36 },
  info: { padding: spacing.md },
  label: {
    ...typography.labelSm,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    ...typography.labelLg,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  address: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

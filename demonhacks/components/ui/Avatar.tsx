import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '@/lib/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  imageUrl?: string | null;
  name?: string;
  size?: AvatarSize;
}

const SIZES: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 64, xl: 96 };
const FONT_SIZES: Record<AvatarSize, number> = { sm: 13, md: 17, lg: 24, xl: 36 };

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ imageUrl, name, size = 'md' }: AvatarProps) {
  const dim = SIZES[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: dim, height: dim, borderRadius: dim / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: FONT_SIZES[size] }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface,
  },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bold,
    color: colors.textInverse,
  },
});

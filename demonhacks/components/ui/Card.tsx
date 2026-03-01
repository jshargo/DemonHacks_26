import React from 'react';
import {
  Pressable,
  View,
  Image,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '@/lib/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  image?: string | null;
  imageAspect?: number; // width / height, default 3/2
  highlighted?: boolean;
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  image,
  imageAspect = 3 / 2,
  highlighted,
  style,
}: CardProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.card,
        highlighted && styles.highlighted,
        pressed && styles.pressed,
        style,
      ]}
    >
      {image && (
        <Image
          source={{ uri: image }}
          style={[styles.image, { aspectRatio: imageAspect }]}
        />
      )}
      <View style={styles.body}>{children}</View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.card,
  },
  highlighted: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  image: {
    width: '100%' as unknown as number,
    backgroundColor: colors.surface,
  },
  body: {
    padding: spacing.md,
  },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts, typography, spacing } from '@/lib/theme';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export function Header({ title, onBack, rightAction, transparent }: HeaderProps) {
  return (
    <View style={[styles.header, transparent && styles.transparent]}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  left: {
    width: 48,
    alignItems: 'flex-start',
  },
  right: {
    width: 48,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.headingMd,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/lib/theme';

interface DividerProps {
  spacing?: number;
}

export function Divider({ spacing: gap = spacing.lg }: DividerProps) {
  return <View style={[styles.line, { marginVertical: gap }]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
});

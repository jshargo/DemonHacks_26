import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows, zIndex } from '@/lib/theme';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

interface FABSpeedDialProps {
  actions: FABAction[];
  mainIcon?: React.ReactNode;
  visible?: boolean;
}

export function FABSpeedDial({
  actions,
  mainIcon,
  visible = true,
}: FABSpeedDialProps) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, [open]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Sub-actions */}
      {actions.map((action, i) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(56 + spacing.sm) * (i + 1)],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.subAction,
              { transform: [{ translateY }], opacity },
            ]}
          >
            <View style={styles.subLabel}>
              <Text style={styles.subLabelText}>{action.label}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.subButton,
                pressed && styles.subPressed,
              ]}
              onPress={() => {
                action.onPress();
                setOpen(false);
              }}
            >
              {action.icon}
            </Pressable>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.mainButton,
          pressed && styles.mainPressed,
        ]}
        onPress={() => setOpen((v) => !v)}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          {mainIcon || <Plus size={24} color={colors.textInverse} />}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing.lg,
    alignItems: 'center',
    zIndex: zIndex.sticky,
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  mainPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.94 }],
  },
  subAction: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subLabel: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    ...shadows.sm,
  },
  subLabelText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  subButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  subPressed: {
    backgroundColor: colors.surface,
    transform: [{ scale: 0.92 }],
  },
});

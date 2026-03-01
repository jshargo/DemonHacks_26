import React from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Compass, Flag, Users, User } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/lib/theme';

const TAB_ICONS: Record<string, typeof Compass> = {
  index: Compass,
  quests: Flag,
  social: Users,
  profile: User,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Explore',
  quests: 'Quests',
  collections: 'Collections',
  social: 'Social',
  profile: 'Profile',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.bar}>
      {state.routes.map((route, index) => {
        // Skip hidden tabs (href: null)
        const { options } = descriptors[route.key];
        if ((options as Record<string, unknown>).href === null) return null;

        const focused = state.index === index;
        const Icon = TAB_ICONS[route.name] ?? Compass;
        const label = TAB_LABELS[route.name] ?? route.name;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}
          >
            <Icon
              size={22}
              color={focused ? colors.primary : colors.textTertiary}
              strokeWidth={focused ? 2.2 : 1.8}
            />
            <Text
              style={[
                styles.label,
                { color: focused ? colors.primary : colors.textTertiary },
                focused && styles.labelFocused,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  labelFocused: {
    fontFamily: fonts.bold,
  },
});

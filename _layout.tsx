import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, Radius } from '../../src/theme/tokens';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: focused ? colors.accent : colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'web' ? 70 : 85,
          paddingBottom: Platform.OS === 'web' ? 8 : 20,
          paddingTop: 8,
          ...(Platform.OS === 'web' ? {
            position: 'fixed' as any,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
          } : {}),
        } as any,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Discover" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺" label="Map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Chats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Groups" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabItemActive: {},
  tabEmoji: {
    fontSize: 22,
    marginBottom: 2,
    opacity: 0.6,
  },
  tabEmojiActive: {
    opacity: 1,
    fontSize: 24,
  },
  tabLabel: {
    ...Typography.captionSmall,
    fontWeight: '600',
  },
});

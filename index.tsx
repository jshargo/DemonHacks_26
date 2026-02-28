import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, Spacing, Radius } from '../../src/theme/tokens';
import EventCard from '../../src/components/EventCard';
import VenueCard from '../../src/components/VenueCard';
import ActivityCard from '../../src/components/ActivityCard';
import TrendingCard from '../../src/components/TrendingCard';
import TabPills from '../../src/components/TabPills';
import SearchBar from '../../src/components/SearchBar';
import { fetchEvents } from '../../src/services/ticketmaster';
import { fetchRestaurants } from '../../src/services/yelp';
import { mockActivities, mockTrending } from '../../src/services/mockData';
import type { Event, Venue, FeedTab } from '../../src/types';

const tabs = [
  { key: 'events', label: 'Events', emoji: '🎫' },
  { key: 'food', label: 'Food', emoji: '🍕' },
  { key: 'activities', label: 'Activities', emoji: '🎯' },
  { key: 'trending', label: 'Trending', emoji: '🔥' },
];

export default function DiscoverScreen() {
  const { colors, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<FeedTab>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [eventsData, venuesData] = await Promise.all([
      fetchEvents(),
      fetchRestaurants(),
    ]);
    setEvents(eventsData);
    setVenues(venuesData);
  }

  function renderFeed() {
    switch (activeTab) {
      case 'events':
        return events.map(event => (
          <EventCard key={event.id} event={event} />
        ));
      case 'food':
        return venues.map(venue => (
          <VenueCard key={venue.id} venue={venue} />
        ));
      case 'activities':
        return mockActivities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} />
        ));
      case 'trending':
        return mockTrending.map(post => (
          <TrendingCard key={post.id} post={post} />
        ));
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Discover</Text>
            <View style={styles.locationRow}>
              <Text style={[styles.locationPin, { color: colors.accent }]}>📍</Text>
              <Text style={[styles.location, { color: colors.text }]}>Chicago, IL</Text>
              <Text style={[styles.chevron, { color: colors.textTertiary }]}> ▾</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: colors.surfaceElevated }]}
              onPress={toggleTheme}
            >
              <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notifButton, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={styles.notifIcon}>🔔</Text>
              <View style={[styles.notifBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.notifBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>R</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={styles.statEmoji}>🎫</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{events.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Events</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={styles.statEmoji}>🍽</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{venues.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Restaurants</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={styles.statEmoji}>🎯</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{mockActivities.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Activities</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{mockTrending.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Trending</Text>
          </View>
        </ScrollView>

        {/* Tab Pills */}
        <TabPills tabs={tabs} activeTab={activeTab} onTabPress={(key) => setActiveTab(key as FeedTab)} />

        {/* Feed */}
        <View style={styles.feed}>
          {renderFeed()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'web' ? Spacing.xl : Spacing.sm,
    paddingBottom: Spacing.md,
  },
  greeting: {
    ...Typography.caption,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 16,
    marginRight: 4,
  },
  location: {
    ...Typography.h2,
  },
  chevron: {
    ...Typography.body,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeIcon: {
    fontSize: 18,
  },
  notifButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifIcon: {
    fontSize: 18,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    ...Typography.bodyBold,
  },
  searchContainer: {
    paddingVertical: Spacing.sm,
  },
  statsRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  statCard: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 90,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    ...Typography.h3,
  },
  statLabel: {
    ...Typography.captionSmall,
  },
  feed: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 100,
    alignItems: 'center',
  },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, Image, ActivityIndicator,
} from 'react-native';

import { useFriends } from '@/hooks/useFriends';
import { useSocialStore } from '@/stores/social-store';
import type { UserProfile } from '@/lib/types';
import { colors, spacing, radii, typography } from '@/lib/theme';

export default function FriendSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const { searchUsers, sendRequest, cancelRequest } = useFriends();
  const { pendingSent, friends } = useSocialStore();

  const friendIds = new Set(friends.map((f) => f.id));
  const sentMap = new Map(pendingSent.map((r: any) => [r.addressee_id, r.id]));

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const data = await searchUsers(query);
    setResults(data);
    setSearching(false);
  };

  const handleAdd = async (userId: string) => {
    await sendRequest(userId);
    setSent((prev) => new Set(prev).add(userId));
  };

  const handleCancel = async (userId: string) => {
    const friendshipId = sentMap.get(userId);
    if (friendshipId) {
      await cancelRequest(friendshipId);
      setSent((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const getButtonState = (userId: string): 'add' | 'pending' | 'friends' => {
    if (friendIds.has(userId)) return 'friends';
    if (sentMap.has(userId) || sent.has(userId)) return 'pending';
    return 'add';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by username..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {searching && <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}

      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => {
          const state = getButtonState(item.id);
          const initials = (item.display_name ?? item.username).slice(0, 2).toUpperCase();
          return (
            <View style={styles.row}>
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.initials}>{initials}</Text>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.display_name ?? item.username}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              {state === 'friends' && (
                <View style={styles.friendsBadge}>
                  <Text style={styles.friendsBadgeText}>Friends</Text>
                </View>
              )}
              {state === 'pending' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {state === 'add' && (
                <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item.id)}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !searching && query.length > 0 && results.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found for "{query}"</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  searchBtn: {
    paddingHorizontal: spacing.lg,
    height: 42,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { ...typography.bodyMd, fontWeight: '700', color: colors.textInverse },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  initials: { color: colors.textInverse, fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { ...typography.labelLg, fontWeight: '600', color: colors.textPrimary },
  username: { ...typography.bodySm, color: colors.textTertiary, marginTop: 2 },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  addBtnText: { ...typography.bodySm, fontWeight: '600', color: colors.textInverse },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  cancelBtnText: { ...typography.bodySm, fontWeight: '600', color: colors.textSecondary },
  friendsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
  },
  friendsBadgeText: { ...typography.bodySm, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { ...typography.bodyMd, color: colors.textTertiary },
});

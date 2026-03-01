import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';

import { useFriends } from '@/hooks/useFriends';
import { useSocialStore } from '@/stores/social-store';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/lib/types';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';

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
        <Button
          title="Search"
          variant="primary"
          size="sm"
          onPress={handleSearch}
        />
      </View>

      {searching && <ActivityIndicator style={{ marginTop: spacing['5xl'] }} color={colors.primary} />}

      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => {
          const state = getButtonState(item.id);
          const displayName = item.display_name ?? item.username;
          return (
            <View style={styles.row}>
              <View style={styles.avatarWrap}>
                <Avatar imageUrl={item.avatar_url} name={displayName} size="md" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              {state === 'friends' && (
                <Button
                  title="Friends"
                  variant="ghost"
                  size="sm"
                  disabled
                  style={{ backgroundColor: colors.success + '18' }}
                />
              )}
              {state === 'pending' && (
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => handleCancel(item.id)}
                  style={{ backgroundColor: colors.surface, borderColor: colors.surface }}
                />
              )}
              {state === 'add' && (
                <Button
                  title="+ Add"
                  variant="primary"
                  size="sm"
                  onPress={() => handleAdd(item.id)}
                />
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
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  name: {
    ...typography.headingSm,
    color: colors.textPrimary,
  },
  username: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
  },
});

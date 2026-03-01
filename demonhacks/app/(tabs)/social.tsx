import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useSocialStore } from '@/stores/social-store';
import { useFriends } from '@/hooks/useFriends';
import { useChats } from '@/hooks/useChats';
import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { FriendCard } from '@/components/social/FriendCard';
import { FriendRequestCard } from '@/components/social/FriendRequestCard';
import { ChatListItem } from '@/components/social/ChatListItem';
import { NewChatModal } from '@/components/social/NewChatModal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Chat, UserProfile } from '@/lib/types';
import { colors, fonts, typography, spacing, radii, shadows } from '@/lib/theme';

type Tab = 'chats' | 'friends' | 'leaderboard';

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const medalColor = MEDAL_COLORS[entry.rank];
  const displayName = entry.display_name ?? entry.username ?? '?';

  return (
    <View style={[styles.lbRow, entry.isCurrentUser && styles.lbRowHighlight]}>
      <View style={[
        styles.lbRank,
        medalColor ? { backgroundColor: medalColor } : styles.lbRankDefault,
      ]}>
        <Text style={[
          styles.lbRankText,
          medalColor ? { color: colors.textInverse } : { color: colors.textSecondary },
        ]}>
          {entry.rank}
        </Text>
      </View>

      <View style={styles.lbAvatarWrap}>
        <Avatar imageUrl={entry.avatar_url} name={displayName} size="md" />
      </View>

      <View style={styles.lbInfo}>
        <Text style={styles.lbName} numberOfLines={1}>
          {displayName}
          {entry.isCurrentUser ? ' (You)' : ''}
        </Text>
        <Text style={styles.lbUsername}>@{entry.username}</Text>
      </View>

      <View style={styles.lbXpContainer}>
        <Text style={styles.lbXpValue}>{entry.xp.toLocaleString()}</Text>
        <Text style={styles.lbXpLabel}>XP</Text>
      </View>
    </View>
  );
}

export default function SocialScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('chats');
  const [newChatVisible, setNewChatVisible] = useState(false);

  const { friends, pendingReceived, chats } = useSocialStore();
  const { loadFriends, acceptRequest, declineRequest, unfriend } = useFriends();
  const { loadChats, openOrCreateDM, createGroupChat } = useChats();
  const { entries, loading: lbLoading, loadLeaderboard } = useLeaderboard();

  const sortedChats = [...chats].sort((a, b) => {
    const aTime = (a.last_message as any)?.created_at ?? a.created_at;
    const bTime = (b.last_message as any)?.created_at ?? b.created_at;
    return bTime > aTime ? 1 : -1;
  });

  useEffect(() => {
    loadFriends();
    loadChats();
    loadLeaderboard();
    const poll = setInterval(loadChats, 5000);
    return () => clearInterval(poll);
  }, []);

  const handleOpenChat = (chat: Chat) => {
    router.push(`/chat/${chat.id}`);
  };

  const handleMessage = async (profile: UserProfile) => {
    const chatId = await openOrCreateDM(profile.id);
    if (chatId) {
      router.push(`/chat/${chatId}` as any);
    }
  };

  const handleCreateDM = async (friendId: string) => {
    const chatId = await openOrCreateDM(friendId);
    if (chatId) router.push(`/chat/${chatId}`);
  };

  const handleCreateGroup = async (name: string, memberIds: string[]) => {
    const chatId = await createGroupChat(name, memberIds);
    if (chatId) router.push(`/chat/${chatId}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.headerActions}>
          {tab === 'friends' && (
            <Button
              title="+ Add"
              variant="primary"
              size="sm"
              onPress={() => router.push('/friends/search')}
            />
          )}
          {tab === 'chats' && (
            <Button
              title="+ New"
              variant="primary"
              size="sm"
              onPress={() => setNewChatVisible(true)}
            />
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        {(['chats', 'friends', 'leaderboard'] as Tab[]).map((t) => {
          const isActive = tab === t;
          const label = t === 'leaderboard' ? 'Ranks' : t.charAt(0).toUpperCase() + t.slice(1);
          return (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                title={label}
                variant={isActive ? 'primary' : 'ghost'}
                size="sm"
                onPress={() => {
                  setTab(t);
                  if (t === 'leaderboard') loadLeaderboard();
                }}
                style={!isActive ? { backgroundColor: colors.surface } : undefined}
              />
              {t === 'friends' && pendingReceived.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingReceived.length}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {tab === 'chats' && (
        <FlatList
          data={sortedChats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatListItem chat={item} onPress={handleOpenChat} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDCAC'}</Text>
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySubtitle}>Start a conversation with a friend</Text>
            </View>
          }
        />
      )}

      {tab === 'friends' && (
        <FlatList
          data={[
            ...pendingReceived.map((r) => ({ _type: 'request' as const, data: r })),
            ...friends.map((f) => ({ _type: 'friend' as const, data: f })),
          ]}
          keyExtractor={(item) => ('id' in item.data ? item.data.id : (item.data as any).id)}
          renderItem={({ item }) => {
            if (item._type === 'request') {
              return (
                <FriendRequestCard
                  request={item.data as any}
                  onAccept={acceptRequest}
                  onDecline={declineRequest}
                />
              );
            }
            return (
              <FriendCard
                profile={item.data as UserProfile}
                onMessage={handleMessage}
                onUnfriend={unfriend}
                onPress={() => router.push(`/friends/${(item.data as UserProfile).id}` as any)}
              />
            );
          }}
          ListHeaderComponent={
            pendingReceived.length > 0 ? (
              <Text style={styles.sectionLabel}>Friend Requests</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{'\uD83D\uDC65'}</Text>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptySubtitle}>Search for people by username</Text>
              <Button
                title="Find Friends"
                variant="primary"
                size="md"
                onPress={() => router.push('/friends/search')}
                style={{ marginTop: spacing.lg }}
              />
            </View>
          }
        />
      )}

      {tab === 'leaderboard' && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LeaderboardRow entry={item} />}
          contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
          ListEmptyComponent={
            lbLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptySubtitle, { marginTop: spacing.md }]}>Loading leaderboard...</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>{'\uD83C\uDFC6'}</Text>
                <Text style={styles.emptyTitle}>No rankings yet</Text>
                <Text style={styles.emptySubtitle}>Complete quests to earn XP and climb the leaderboard</Text>
              </View>
            )
          }
        />
      )}

      <NewChatModal
        visible={newChatVisible}
        friends={friends}
        onClose={() => setNewChatVisible(false)}
        onCreateDM={handleCreateDM}
        onCreateGroup={handleCreateGroup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.displaySm,
    color: colors.textPrimary,
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.xs,
  },
  badgeText: {
    color: colors.textInverse,
    fontFamily: fonts.black,
    fontSize: 11,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing['3xl'] },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    ...typography.headingMd,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Leaderboard
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lbRowHighlight: {
    backgroundColor: colors.primary + '10',
  },
  lbRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  lbRankDefault: {
    backgroundColor: colors.surface,
  },
  lbRankText: {
    ...typography.labelLg,
    fontFamily: fonts.bold,
  },
  lbAvatarWrap: {
    marginRight: spacing.md,
  },
  lbInfo: {
    flex: 1,
  },
  lbName: {
    ...typography.headingSm,
    color: colors.textPrimary,
  },
  lbUsername: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lbXpContainer: {
    alignItems: 'flex-end',
  },
  lbXpValue: {
    ...typography.headingSm,
    color: colors.primary,
  },
  lbXpLabel: {
    ...typography.labelSm,
    color: colors.textTertiary,
  },
});

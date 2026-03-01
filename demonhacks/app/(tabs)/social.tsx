import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useSocialStore } from '@/stores/social-store';
import { useFriends } from '@/hooks/useFriends';
import { useChats } from '@/hooks/useChats';
import { FriendCard } from '@/components/social/FriendCard';
import { FriendRequestCard } from '@/components/social/FriendRequestCard';
import { ChatListItem } from '@/components/social/ChatListItem';
import { NewChatModal } from '@/components/social/NewChatModal';
import type { Chat, UserProfile } from '@/lib/types';
import { colors, spacing, radii, typography } from '@/lib/theme';

type Tab = 'chats' | 'friends';

export default function SocialScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('chats');
  const [newChatVisible, setNewChatVisible] = useState(false);

  const { friends, pendingReceived, chats } = useSocialStore();
  const { loadFriends, acceptRequest, declineRequest, unfriend } = useFriends();
  const { loadChats, openOrCreateDM, createGroupChat } = useChats();

  const sortedChats = [...chats].sort((a, b) => {
    const aTime = (a.last_message as any)?.created_at ?? a.created_at;
    const bTime = (b.last_message as any)?.created_at ?? b.created_at;
    return bTime > aTime ? 1 : -1;
  });

  useEffect(() => {
    loadFriends();
    loadChats();
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
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/friends/search')}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          )}
          {tab === 'chats' && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setNewChatVisible(true)}>
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'chats' && styles.tabBtnActive]}
          onPress={() => setTab('chats')}
        >
          <Text style={[styles.tabText, tab === 'chats' && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'friends' && styles.tabBtnActive]}
          onPress={() => setTab('friends')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>Friends</Text>
            {pendingReceived.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingReceived.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {tab === 'chats' && (
        <FlatList
          data={sortedChats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatListItem chat={item} onPress={handleOpenChat} />}
          ListEmptyComponent={
            <View style={styles.empty}>
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
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptySubtitle}>Search for people by username</Text>
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={() => router.push('/friends/search')}
              >
                <Text style={styles.searchBtnText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
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
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  addBtnText: { ...typography.bodyMd, fontWeight: '700', color: colors.textInverse },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { ...typography.labelLg, color: colors.textSecondary },
  tabTextActive: { color: colors.textInverse },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.textInverse, ...typography.caption, fontWeight: '800' },
  sectionLabel: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing['3xl'] },
  emptyTitle: { ...typography.headingMd, color: colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { ...typography.bodyMd, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.xl },
  searchBtn: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  searchBtnText: { ...typography.bodyMd, fontWeight: '700', color: colors.textInverse },
});

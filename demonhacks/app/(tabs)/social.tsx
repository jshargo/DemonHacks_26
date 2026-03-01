import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView,
  Image, ActivityIndicator,
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
import type { Chat, UserProfile } from '@/lib/types';

type Tab = 'chats' | 'friends' | 'leaderboard';

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const medalColor = MEDAL_COLORS[entry.rank];
  const initials = (entry.display_name ?? entry.username ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.lbRow, entry.isCurrentUser && styles.lbRowHighlight]}>
      <View style={[
        styles.lbRank,
        medalColor ? { backgroundColor: medalColor } : styles.lbRankDefault,
      ]}>
        <Text style={[
          styles.lbRankText,
          medalColor ? { color: '#fff' } : { color: '#888' },
        ]}>
          {entry.rank}
        </Text>
      </View>

      <View style={styles.lbAvatar}>
        {entry.avatar_url ? (
          <Image source={{ uri: entry.avatar_url }} style={styles.lbAvatarImg} />
        ) : (
          <Text style={styles.lbInitials}>{initials}</Text>
        )}
      </View>

      <View style={styles.lbInfo}>
        <Text style={styles.lbName} numberOfLines={1}>
          {entry.display_name ?? entry.username}
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
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'leaderboard' && styles.tabBtnActive]}
          onPress={() => { setTab('leaderboard'); loadLeaderboard(); }}
        >
          <Text style={[styles.tabText, tab === 'leaderboard' && styles.tabTextActive]}>Ranks</Text>
        </TouchableOpacity>
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

      {tab === 'leaderboard' && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LeaderboardRow entry={item} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            lbLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>Loading leaderboard...</Text>
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
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  headerActions: { flexDirection: 'row', gap: 8 },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  tabBtnActive: { backgroundColor: '#6C63FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  searchBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#6C63FF',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Leaderboard
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  lbRowHighlight: {
    backgroundColor: '#6C63FF10',
  },
  lbRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lbRankDefault: {
    backgroundColor: '#F0F0F0',
  },
  lbRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lbAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  lbAvatarImg: {
    width: 40,
    height: 40,
  },
  lbInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  lbInfo: {
    flex: 1,
  },
  lbName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  lbUsername: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  lbXpContainer: {
    alignItems: 'flex-end',
  },
  lbXpValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6C63FF',
  },
  lbXpLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
});

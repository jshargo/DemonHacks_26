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
    console.log('[handleMessage] called for', profile.id);
    const chatId = await openOrCreateDM(profile.id);
    console.log('[handleMessage] chatId =', chatId);
    if (chatId) {
      console.log('[handleMessage] navigating to /chat/' + chatId);
      router.push(`/chat/${chatId}` as any);
    } else {
      console.warn('[handleMessage] openOrCreateDM returned null');
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
              <Text style={styles.emptyIcon}>💬</Text>
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
              <Text style={styles.emptyIcon}>👥</Text>
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
});

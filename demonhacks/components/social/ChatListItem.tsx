import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Chat } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { useSocialStore } from '@/stores/social-store';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface Props {
  chat: Chat;
  onPress: (chat: Chat) => void;
}

export function ChatListItem({ chat, onPress }: Props) {
  const myId = useAuthStore((s) => s.session?.user?.id);
  const lastReadAt = useSocialStore((s) => s.lastReadAt);

  const displayName = (() => {
    if (chat.type === 'group') return chat.name ?? 'Group Chat';
    const other = chat.members?.find((m: any) => m.user_id !== myId);
    return other?.profile?.display_name ?? other?.profile?.username ?? 'Chat';
  })();

  const lastMsg = chat.last_message;
  const preview = (() => {
    if (!lastMsg) return 'No messages yet';
    if ((lastMsg as any).type === 'spot') return '📍 Shared a spot';
    if ((lastMsg as any).type === 'event') return '🗓 Shared an event';
    return (lastMsg as any).content ?? '';
  })();

  const isUnread = (() => {
    if (!lastMsg) return false;
    const readAt = lastReadAt[chat.id];
    if (!readAt) return true;
    return (lastMsg as any).created_at > readAt;
  })();

  const initials = displayName.slice(0, 2).toUpperCase();

  const timestamp = lastMsg ? timeAgo((lastMsg as any).created_at) : '';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(chat)}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isUnread && styles.nameUnread]} numberOfLines={1}>{displayName}</Text>
          {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
        </View>
        <Text style={[styles.preview, isUnread && styles.previewUnread]} numberOfLines={1}>{preview}</Text>
      </View>
      {isUnread && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initials: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
  nameUnread: { fontWeight: '800', color: '#000' },
  timestamp: { fontSize: 12, color: '#aaa', marginLeft: 4 },
  preview: { fontSize: 13, color: '#888', marginTop: 2 },
  previewUnread: { color: '#333', fontWeight: '600' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C63FF',
    marginLeft: 8,
  },
});

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Modal, SafeAreaView, ActivityIndicator,
} from 'react-native';
import type { Chat } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

interface Props {
  visible: boolean;
  chats: Chat[];
  onClose: () => void;
  onShare: (chatId: string) => Promise<void>;
}

function getChatName(chat: Chat, myId?: string): string {
  if (chat.type === 'group') return chat.name ?? 'Group Chat';
  const other = chat.members?.find((m: any) => m.user_id !== myId);
  return other?.profile?.display_name ?? other?.profile?.username ?? 'Chat';
}

export function ShareToChatModal({ visible, chats, onClose, onShare }: Props) {
  const myId = useAuthStore((s) => s.session?.user?.id);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const handleShare = async (chatId: string) => {
    setSending(chatId);
    await onShare(chatId);
    setSending(null);
    setSent(chatId);
    setTimeout(() => {
      setSent(null);
      onClose();
    }, 800);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Share to Chat</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const name = getChatName(item, myId);
            const initials = name.slice(0, 2).toUpperCase();
            const isSending = sending === item.id;
            const isSent = sent === item.id;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleShare(item.id)}
                disabled={!!sending}
              >
                <View style={styles.avatar}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
                <Text style={styles.name}>{name}</Text>
                {isSending && <ActivityIndicator size="small" color="#6C63FF" />}
                {isSent && <Text style={styles.sentText}>✓ Sent!</Text>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No chats yet. Start a conversation first!</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111' },
  cancel: { fontSize: 16, color: '#6C63FF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  initials: { color: '#fff', fontWeight: '700', fontSize: 16 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111' },
  sentText: { color: '#6C63FF', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
});

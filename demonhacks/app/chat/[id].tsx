import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { useSocialStore } from '@/stores/social-store';
import { useChats } from '@/hooks/useChats';
import { MessageBubble } from '@/components/social/MessageBubble';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, radii, typography } from '@/lib/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const myId = useAuthStore((s) => s.session?.user?.id);
  const { messages, chats, messagesLoading } = useSocialStore();
  const { loadMessages, subscribeToChat, unsubscribeFromChat, sendMessage } = useChats();
  const reloadMessages = () => { if (id) loadMessages(id); };
  const { setActiveChatId, markChatRead } = useSocialStore();

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const chat = chats.find((c) => c.id === id);

  const chatTitle = (() => {
    if (!chat) return 'Chat';
    if (chat.type === 'group') return chat.name ?? 'Group Chat';
    const other = chat.members?.find((m) => m.user_id !== myId);
    return other?.profile?.display_name ?? other?.profile?.username ?? 'Chat';
  })();

  useEffect(() => {
    navigation.setOptions({ title: chatTitle });
  }, [chatTitle]);

  useEffect(() => {
    if (!id) return;
    setActiveChatId(id);
    markChatRead(id);
    loadMessages(id);
    subscribeToChat(id);

    const poll = setInterval(() => loadMessages(id), 3000);

    return () => {
      clearInterval(poll);
      unsubscribeFromChat();
      setActiveChatId(null);
    };
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !id) return;
    setInput('');
    await sendMessage(id, text);
    reloadMessages();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            messagesLoading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
              </View>
            )
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            placeholderTextColor={colors.textTertiary}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDis]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendIcon}>{'\u2191'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    flexGrow: 1,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { ...typography.bodyMd, color: colors.textTertiary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDis: { backgroundColor: colors.border },
  sendIcon: { color: colors.textInverse, fontSize: 20, fontWeight: '700' },
});

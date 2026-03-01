import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { useSocialStore } from '@/stores/social-store';
import { useChats } from '@/hooks/useChats';
import { MessageBubble } from '@/components/social/MessageBubble';
import { useAuthStore } from '@/stores/auth-store';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const myId = useAuthStore((s) => s.session?.user?.id);
  const { messages, chats, messagesLoading } = useSocialStore();
  const { loadMessages, subscribeToChat, unsubscribeFromChat, sendMessage } = useChats();
  const reloadMessages = () => { if (id) loadMessages(id); };
  const { setActiveChatId, markChatRead } = useSocialStore();

  const [input, setInput] = useState('');
  const [groupInfoVisible, setGroupInfoVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const chat = chats.find((c) => c.id === id);
  const isGroup = chat?.type === 'group';

  // Derive chat title
  const chatTitle = (() => {
    if (!chat) return 'Chat';
    if (isGroup) return chat.name ?? 'Group Chat';
    const other = chat.members?.find((m) => m.user_id !== myId);
    return other?.profile?.display_name ?? other?.profile?.username ?? 'Chat';
  })();

  useEffect(() => {
    navigation.setOptions({
      title: chatTitle,
      headerRight: isGroup ? () => (
        <TouchableOpacity onPress={() => setGroupInfoVisible(true)} style={{ marginRight: 12 }}>
          <Text style={{ color: '#6C63FF', fontSize: 22 }}>ⓘ</Text>
        </TouchableOpacity>
      ) : undefined,
    });
  }, [chatTitle, isGroup]);

  useEffect(() => {
    if (!id) return;
    setActiveChatId(id);
    markChatRead(id);
    loadMessages(id);
    subscribeToChat(id);

    // Poll every 3s as fallback in case realtime is not enabled
    const poll = setInterval(() => loadMessages(id), 3000);

    return () => {
      clearInterval(poll);
      unsubscribeFromChat();
      setActiveChatId(null);
    };
  }, [id]);

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
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && !messagesLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
            </View>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} myId={myId} />
            ))
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDis]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Group Info Modal */}
      <Modal
        visible={groupInfoVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGroupInfoVisible(false)}
      >
        <SafeAreaView style={styles.infoSafe}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoHeaderTitle}>Group Info</Text>
            <TouchableOpacity onPress={() => setGroupInfoVisible(false)}>
              <Text style={styles.infoDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Group avatar + name */}
            <View style={styles.infoHero}>
              <View style={styles.infoAvatar}>
                <Text style={styles.infoAvatarText}>
                  {chatTitle.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.infoName}>{chatTitle}</Text>
              <Text style={styles.infoCount}>
                {chat?.members?.length ?? 0} members
              </Text>
            </View>

            {/* Members list */}
            <Text style={styles.infoSectionLabel}>Members</Text>
            {chat?.members?.map((m) => {
              const name = m.profile?.display_name ?? m.profile?.username ?? 'Unknown';
              const initials = name.slice(0, 2).toUpperCase();
              const isYou = m.user_id === myId;
              return (
                <View key={m.user_id} style={styles.infoMemberRow}>
                  <View style={styles.infoMemberAvatar}>
                    <Text style={styles.infoMemberInitials}>{initials}</Text>
                  </View>
                  <View style={styles.infoMemberInfo}>
                    <Text style={styles.infoMemberName}>
                      {name}{isYou ? ' (You)' : ''}
                    </Text>
                    <Text style={styles.infoMemberUsername}>@{m.profile?.username}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  messageList: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#888', fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDis: { backgroundColor: '#CCC' },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Group info modal
  infoSafe: { flex: 1, backgroundColor: '#fff' },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  infoHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  infoDone: { fontSize: 16, color: '#6C63FF', fontWeight: '600' },
  infoHero: { alignItems: 'center', paddingVertical: 28 },
  infoAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  infoAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  infoName: { fontSize: 22, fontWeight: '800', color: '#111' },
  infoCount: { fontSize: 14, color: '#888', marginTop: 4 },
  infoSectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5E5',
    paddingTop: 16,
  },
  infoMemberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0',
  },
  infoMemberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  infoMemberInitials: { color: '#fff', fontWeight: '700', fontSize: 16 },
  infoMemberInfo: { flex: 1 },
  infoMemberName: { fontSize: 15, fontWeight: '600', color: '#111' },
  infoMemberUsername: { fontSize: 13, color: '#888', marginTop: 2 },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { SpotShareCard } from './SpotShareCard';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const myId = useAuthStore((s) => s.session?.user?.id);
  const isMe = message.sender_id === myId;

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.wrapper, isMe ? styles.wrapperMe : styles.wrapperThem]}>
      {!isMe && (
        <Text style={styles.senderName}>
          {message.sender?.display_name ?? message.sender?.username ?? ''}
        </Text>
      )}
      {message.type === 'text' && (
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.text, isMe ? styles.textMe : styles.textThem]}>
            {message.content}
          </Text>
        </View>
      )}
      {(message.type === 'spot' || message.type === 'event') && message.metadata && (
        <SpotShareCard metadata={message.metadata} type={message.type} isMe={isMe} />
      )}
      <Text style={[styles.time, isMe ? styles.timeMe : styles.timeThem]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 4, maxWidth: '80%' },
  wrapperMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapperThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: { fontSize: 11, color: '#888', marginBottom: 2, marginLeft: 4 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMe: { backgroundColor: '#6C63FF' },
  bubbleThem: { backgroundColor: '#F0F0F0' },
  text: { fontSize: 15, lineHeight: 20 },
  textMe: { color: '#fff' },
  textThem: { color: '#111' },
  time: { fontSize: 11, marginTop: 3 },
  timeMe: { color: '#aaa', marginRight: 4 },
  timeThem: { color: '#aaa', marginLeft: 4 },
});

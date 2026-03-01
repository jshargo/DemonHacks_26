import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '@/lib/types';
import { SpotShareCard } from './SpotShareCard';

interface Props {
  message: Message;
  myId?: string;
}

export function MessageBubble({ message, myId }: Props) {
  const isMe = !!myId && (message.sender_id === myId || message.sender?.id === myId);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.row}>
      {isMe && <View style={styles.spacer} />}

      <View style={[styles.inner, isMe ? styles.innerMe : styles.innerThem]}>
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

      {!isMe && <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  spacer: { flex: 1 },
  inner: { maxWidth: '80%' },
  innerMe: { alignItems: 'flex-end' },
  innerThem: { alignItems: 'flex-start' },
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

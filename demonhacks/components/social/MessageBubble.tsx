import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { SpotShareCard } from './SpotShareCard';
import { colors, fonts, typography, spacing } from '@/lib/theme';

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
  wrapper: { marginVertical: spacing.xs, maxWidth: '80%' },
  wrapperMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapperThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
    marginLeft: spacing.xs,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMe: { backgroundColor: colors.primary },
  bubbleThem: { backgroundColor: colors.surface },
  text: {
    ...typography.bodyMd,
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: { color: colors.textInverse },
  textThem: { color: colors.textPrimary },
  time: {
    ...typography.caption,
    marginTop: 3,
  },
  timeMe: { color: colors.textTertiary, marginRight: spacing.xs },
  timeThem: { color: colors.textTertiary, marginLeft: spacing.xs },
});

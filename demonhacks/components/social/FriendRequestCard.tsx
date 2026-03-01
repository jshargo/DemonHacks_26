import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Friendship } from '@/lib/types';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface Props {
  request: Friendship;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export function FriendRequestCard({ request, onAccept, onDecline }: Props) {
  const profile = request.requester;
  if (!profile) return null;

  const displayName = profile.display_name ?? profile.username;

  return (
    <View style={styles.row}>
      <View style={styles.avatarWrap}>
        <Avatar imageUrl={profile.avatar_url} name={displayName} size="md" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          title="Accept"
          variant="primary"
          size="sm"
          onPress={() => onAccept(request.id)}
        />
        <Button
          title="Decline"
          variant="ghost"
          size="sm"
          onPress={() => onDecline(request.id)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  name: {
    ...typography.headingSm,
    color: colors.textPrimary,
  },
  username: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
});

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import type { UserProfile } from '@/lib/types';
import { colors, fonts, typography, spacing, radii } from '@/lib/theme';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface Props {
  profile: UserProfile;
  onMessage: (profile: UserProfile) => void;
  onUnfriend?: (userId: string) => void;
}

export function FriendCard({ profile, onMessage, onUnfriend }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);

  const displayName = profile.display_name ?? profile.username;

  const openMenu = (e?: any) => {
    if (!onUnfriend) return;
    if (e?.preventDefault) e.preventDefault(); // suppress browser context menu on web
    setMenuVisible(true);
  };

  return (
    <>
      <Pressable
        style={styles.row}
        onLongPress={openMenu}
        // @ts-ignore — onContextMenu is a valid web prop
        onContextMenu={openMenu}
      >
        <View style={styles.avatarWrap}>
          <Avatar imageUrl={profile.avatar_url} name={displayName} size="md" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        <Button
          title="Message"
          variant="primary"
          size="sm"
          onPress={() => onMessage(profile)}
        />
      </Pressable>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuName}>{displayName}</Text>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); onUnfriend?.(profile.id); }}
            >
              <Text style={styles.menuItemDanger}>Remove Friend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuItemCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
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
  // Context menu
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    width: 240,
    overflow: 'hidden',
  },
  menuName: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  menuItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  menuItemDanger: {
    ...typography.headingSm,
    color: colors.error,
  },
  menuItemCancel: {
    ...typography.headingSm,
    color: colors.primary,
  },
});

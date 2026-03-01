import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, Pressable } from 'react-native';
import type { UserProfile } from '@/lib/types';

interface Props {
  profile: UserProfile;
  onMessage: (profile: UserProfile) => void;
  onUnfriend?: (userId: string) => void;
}

export function FriendCard({ profile, onMessage, onUnfriend }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);

  const initials = (profile.display_name ?? profile.username)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
        <View style={styles.avatar}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{profile.display_name ?? profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        <TouchableOpacity style={styles.msgBtn} onPress={() => onMessage(profile)}>
          <Text style={styles.msgBtnText}>Message</Text>
        </TouchableOpacity>
      </Pressable>

      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuName}>{profile.display_name ?? profile.username}</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  initials: { color: '#fff', fontWeight: '700', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111' },
  username: { fontSize: 13, color: '#888', marginTop: 2 },
  msgBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
  },
  msgBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  // Context menu
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 240,
    overflow: 'hidden',
  },
  menuName: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5E5' },
  menuItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  menuItemDanger: { fontSize: 16, color: '#FF3B30', fontWeight: '600' },
  menuItemCancel: { fontSize: 16, color: '#6C63FF', fontWeight: '600' },
});

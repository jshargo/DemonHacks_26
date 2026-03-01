import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList,
} from 'react-native';
import type { UserProfile } from '@/lib/types';
import { colors, fonts, typography, spacing, radii, shadows } from '@/lib/theme';
import { Avatar } from '@/components/ui/Avatar';

interface Props {
  visible: boolean;
  friends: UserProfile[];
  onClose: () => void;
  onCreateDM: (friendId: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
}

export function NewChatModal({ visible, friends, onClose, onCreateDM, onCreateGroup }: Props) {
  const [mode, setMode] = useState<'pick' | 'group'>('pick');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const reset = () => {
    setMode('pick');
    setSelected([]);
    setGroupName('');
    onClose();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDone = () => {
    if (mode === 'pick' && selected.length === 1) {
      onCreateDM(selected[0]);
    } else if (mode === 'group' && selected.length >= 1) {
      onCreateGroup(groupName || 'Group Chat', selected);
    }
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={reset}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={reset}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Message</Text>
          <TouchableOpacity
            onPress={handleDone}
            disabled={selected.length === 0}
          >
            <Text style={[styles.done, selected.length === 0 && styles.doneDis]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'pick' && styles.tabActive]}
            onPress={() => setMode('pick')}
          >
            <Text style={[styles.tabText, mode === 'pick' && styles.tabTextActive]}>Direct</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'group' && styles.tabActive]}
            onPress={() => setMode('group')}
          >
            <Text style={[styles.tabText, mode === 'group' && styles.tabTextActive]}>Group</Text>
          </TouchableOpacity>
        </View>

        {mode === 'group' && (
          <TextInput
            style={styles.groupInput}
            placeholder="Group name (optional)"
            placeholderTextColor={colors.textTertiary}
            value={groupName}
            onChangeText={setGroupName}
          />
        )}

        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);
            const displayName = item.display_name ?? item.username;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  if (mode === 'pick') {
                    setSelected([item.id]);
                  } else {
                    toggleSelect(item.id);
                  }
                }}
              >
                <View style={styles.avatarWrap}>
                  <Avatar imageUrl={item.avatar_url} name={displayName} size="md" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{displayName}</Text>
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
                <View style={[styles.check, isSelected && styles.checkSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No friends yet. Add some first!</Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.headingMd,
    color: colors.textPrimary,
  },
  cancel: {
    ...typography.bodyLg,
    color: colors.primary,
  },
  done: {
    ...typography.bodyLg,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  doneDis: { color: colors.textTertiary },
  tabs: {
    flexDirection: 'row',
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  tabText: {
    ...typography.labelLg,
    color: colors.textSecondary,
  },
  tabTextActive: { color: colors.textPrimary },
  groupInput: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textPrimary,
  },
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
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: {
    color: colors.textInverse,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  empty: {
    ...typography.bodyMd,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing['5xl'],
  },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, Image,
} from 'react-native';
import type { UserProfile } from '@/lib/types';

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
            value={groupName}
            onChangeText={setGroupName}
          />
        )}

        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.id);
            const initials = (item.display_name ?? item.username).slice(0, 2).toUpperCase();
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
                <View style={styles.avatar}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.initials}>{initials}</Text>
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.display_name ?? item.username}</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  title: { fontSize: 17, fontWeight: '700' },
  cancel: { fontSize: 16, color: '#6C63FF' },
  done: { fontSize: 16, color: '#6C63FF', fontWeight: '700' },
  doneDis: { color: '#ccc' },
  tabs: { flexDirection: 'row', margin: 12, backgroundColor: '#F0F0F0', borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#111' },
  groupInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    fontSize: 15,
  },
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
  username: { fontSize: 13, color: '#888' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
});

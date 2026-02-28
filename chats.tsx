import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { mockChats } from '../../src/services/mockData';

export default function ChatsScreen() {
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Chats</Text>
                <TouchableOpacity style={[styles.newChatButton, { backgroundColor: colors.accent }]}>
                    <Text style={styles.newChatText}>+ New Chat</Text>
                </TouchableOpacity>
            </View>

            {/* Chat List */}
            <FlatList
                data={mockChats}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.chatRow, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.chatAvatar, { backgroundColor: item.isGroup ? colors.secondaryBg : colors.accentBg }]}>
                            <Text style={styles.chatAvatarText}>
                                {item.isGroup ? '👥' : item.name.charAt(0)}
                            </Text>
                        </View>
                        <View style={styles.chatContent}>
                            <View style={styles.chatTop}>
                                <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={[styles.chatTime, { color: colors.textTertiary }]}>
                                    {item.lastMessageTime}
                                </Text>
                            </View>
                            <View style={styles.chatBottom}>
                                <Text style={[styles.chatMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {item.lastMessage}
                                </Text>
                                {item.unreadCount > 0 && (
                                    <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
                                {item.memberCount} {item.isGroup ? 'members' : ''}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === 'web' ? Spacing.xl : Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    title: {
        ...Typography.h1,
    },
    newChatButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
    },
    newChatText: {
        color: '#FFF',
        ...Typography.caption,
        fontWeight: '700',
    },
    list: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: Radius.xl,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        gap: Spacing.md,
    },
    chatAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatAvatarText: {
        fontSize: 20,
    },
    chatContent: {
        flex: 1,
    },
    chatTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    chatName: {
        ...Typography.bodyBold,
        flex: 1,
    },
    chatTime: {
        ...Typography.captionSmall,
    },
    chatBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    chatMessage: {
        ...Typography.caption,
        flex: 1,
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    memberCount: {
        ...Typography.captionSmall,
    },
});

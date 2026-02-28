import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme/tokens';

export default function ProfileScreen() {
    const { colors, toggleTheme, isDark } = useTheme();

    const stats = [
        { label: 'Communities', value: '3', emoji: '👥' },
        { label: 'Saved Spots', value: '24', emoji: '📌' },
        { label: 'Check-ins', value: '57', emoji: '📍' },
        { label: 'Events', value: '12', emoji: '🎫' },
    ];

    const menuItems = [
        { label: 'Edit Profile', emoji: '✏️' },
        { label: 'My Activity History', emoji: '📋' },
        { label: 'Saved Places', emoji: '❤️' },
        { label: 'Notification Settings', emoji: '🔔' },
        { label: 'Privacy & Location', emoji: '🔒' },
        { label: 'Dark Mode', emoji: isDark ? '☀️' : '🌙', action: toggleTheme, toggle: true },
        { label: 'Help & Support', emoji: '💬' },
        { label: 'About ThingsToDoChi', emoji: 'ℹ️' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
                </View>

                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card }, Shadows.card]}>
                    <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.avatarLargeText}>R</Text>
                    </View>
                    <Text style={[styles.name, { color: colors.text }]}>Rayyan Hussain</Text>
                    <Text style={[styles.bio, { color: colors.textSecondary }]}>
                        🏙️ Chicago Local · 📍 River North · Exploring the city one spot at a time
                    </Text>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        {stats.map((stat, i) => (
                            <View key={i} style={styles.statItem}>
                                <Text style={styles.statEmoji}>{stat.emoji}</Text>
                                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={[styles.editButton, { borderColor: colors.border }]}>
                        <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Menu Items */}
                <View style={[styles.menuCard, { backgroundColor: colors.card }]}>
                    {menuItems.map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[
                                styles.menuItem,
                                i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
                            ]}
                            onPress={item.action}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuLeft}>
                                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                            </View>
                            {item.toggle ? (
                                <View style={[styles.toggleTrack, { backgroundColor: isDark ? colors.accent : colors.border }]}>
                                    <View style={[styles.toggleKnob, { left: isDark ? 22 : 2, backgroundColor: '#FFF' }]} />
                                </View>
                            ) : (
                                <Text style={[styles.menuArrow, { color: colors.textTertiary }]}>›</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.errorBg }]}>
                    <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={[styles.version, { color: colors.textTertiary }]}>
                    ThingsToDoChi v1.0.0
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === 'web' ? Spacing.xl : Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    title: {
        ...Typography.h1,
    },
    profileCard: {
        marginHorizontal: Spacing.xl,
        borderRadius: Radius.xxl,
        padding: Spacing.xxl,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    avatarLargeText: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '700',
    },
    name: {
        ...Typography.h2,
        marginBottom: Spacing.xs,
    },
    bio: {
        ...Typography.caption,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.xl,
        maxWidth: 300,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
        marginBottom: Spacing.xl,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    statItem: {
        alignItems: 'center',
        minWidth: 65,
    },
    statEmoji: {
        fontSize: 18,
        marginBottom: 4,
    },
    statValue: {
        ...Typography.h3,
    },
    statLabel: {
        ...Typography.captionSmall,
    },
    editButton: {
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1.5,
    },
    editButtonText: {
        ...Typography.caption,
        fontWeight: '700',
    },
    menuCard: {
        marginHorizontal: Spacing.xl,
        borderRadius: Radius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.xl,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    menuEmoji: {
        fontSize: 18,
    },
    menuLabel: {
        ...Typography.body,
    },
    menuArrow: {
        fontSize: 22,
        fontWeight: '300',
    },
    toggleTrack: {
        width: 44,
        height: 24,
        borderRadius: 12,
        position: 'relative',
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        position: 'absolute',
        top: 2,
    },
    signOutButton: {
        marginHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    signOutText: {
        ...Typography.bodyBold,
    },
    version: {
        ...Typography.captionSmall,
        textAlign: 'center',
        paddingBottom: 100,
    },
});

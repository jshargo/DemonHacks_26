import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme/tokens';
import { mockCommunities } from '../../src/services/mockData';
import type { Community } from '../../src/types';

export default function CommunitiesScreen() {
    const { colors } = useTheme();
    const [communities, setCommunities] = useState<Community[]>(mockCommunities);

    function toggleJoin(id: string) {
        setCommunities(prev =>
            prev.map(c => c.id === id ? { ...c, isJoined: !c.isJoined } : c)
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Communities</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Find your people in Chicago
                    </Text>
                </View>
            </View>

            {/* Communities Grid */}
            <FlatList
                data={communities}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                numColumns={1}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.communityCard, { backgroundColor: colors.card }, Shadows.card]}
                        activeOpacity={0.85}
                    >
                        <Image source={{ uri: item.image }} style={styles.communityImage} />
                        <View style={styles.cardContent}>
                            <View style={[styles.categoryTag, { backgroundColor: colors.secondaryBg }]}>
                                <Text style={[styles.categoryText, { color: colors.secondary }]}>{item.category}</Text>
                            </View>
                            <Text style={[styles.communityName, { color: colors.text }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                                {item.description}
                            </Text>
                            <View style={styles.cardFooter}>
                                <Text style={[styles.memberCount, { color: colors.textTertiary }]}>
                                    👥 {item.memberCount.toLocaleString()} members
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.joinButton,
                                        {
                                            backgroundColor: item.isJoined ? colors.surfaceElevated : colors.accent,
                                            borderColor: item.isJoined ? colors.border : colors.accent,
                                        },
                                    ]}
                                    onPress={() => toggleJoin(item.id)}
                                >
                                    <Text style={[
                                        styles.joinText,
                                        { color: item.isJoined ? colors.textSecondary : '#FFF' },
                                    ]}>
                                        {item.isJoined ? '✓ Joined' : 'Join'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
        paddingHorizontal: Spacing.xl,
        paddingTop: Platform.OS === 'web' ? Spacing.xl : Spacing.sm,
        paddingBottom: Spacing.lg,
    },
    title: {
        ...Typography.h1,
        marginBottom: 4,
    },
    subtitle: {
        ...Typography.body,
    },
    list: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: 100,
    },
    communityCard: {
        borderRadius: Radius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
        maxWidth: 500,
        width: '100%',
    },
    communityImage: {
        width: '100%',
        height: 140,
        resizeMode: 'cover',
    },
    cardContent: {
        padding: Spacing.lg,
    },
    categoryTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
        marginBottom: Spacing.sm,
    },
    categoryText: {
        ...Typography.captionSmall,
        fontWeight: '600',
    },
    communityName: {
        ...Typography.h3,
        marginBottom: Spacing.xs,
    },
    description: {
        ...Typography.caption,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    memberCount: {
        ...Typography.caption,
    },
    joinButton: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    joinText: {
        ...Typography.caption,
        fontWeight: '700',
    },
});

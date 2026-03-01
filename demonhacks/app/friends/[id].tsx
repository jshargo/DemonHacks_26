import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSocialStore } from '@/stores/social-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChats } from '@/hooks/useChats';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/categories';
import type { UserProfile } from '@/lib/types';

function formatMemberSince(dateStr: string | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const friends = useSocialStore((s) => s.friends);
  const pendingSent = useSocialStore((s) => s.pendingSent);
  const { openOrCreateDM } = useChats();
  const { sendRequest, unfriend, cancelRequest } = useFriends();

  const [profile, setProfile] = useState<UserProfile | null>(
    friends.find((f) => f.id === id) ?? null,
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questProgress, setQuestProgress] = useState<{ id: string; title: string; xp: number; steps: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);

  // Fallback: fetch profile from Supabase if not in friends store
  useEffect(() => {
    if (profile) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setProfile(data as UserProfile);
      setLoading(false);
    })();
  }, [id]);

  // Fetch friend's quest progress
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select('xp_earned, quest_steps(quest_id, quests(id, title))')
        .eq('user_id', id)
        .not('quest_step_id', 'is', null);
      if (error) { console.warn('quest progress fetch error:', error.message); return; }
      if (!data) return;

      const map = new Map<string, { id: string; title: string; xp: number; steps: number }>();
      for (const row of data as any[]) {
        const qs = row.quest_steps;
        if (!qs) continue;
        const quest = qs.quests;
        if (!quest) continue;
        const existing = map.get(quest.id);
        if (existing) {
          existing.xp += row.xp_earned;
          existing.steps += 1;
        } else {
          map.set(quest.id, { id: quest.id, title: quest.title, xp: row.xp_earned, steps: 1 });
        }
      }
      setQuestProgress(Array.from(map.values()));
    })();
  }, [id]);

  // Fetch friend's interests
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('user_onboarding_preferences')
        .select('selected_categories')
        .eq('user_id', id)
        .maybeSingle();
      if (error) console.warn('interests fetch error:', error.message);
      if (data?.selected_categories?.length) {
        setSelectedCategories(data.selected_categories as string[]);
      }
    })();
  }, [id]);

  const isFriend = friends.some((f) => f.id === id);
  const pendingRequest = (pendingSent as any[]).find((r) => r.addressee_id === id);
  const isPending = !!pendingRequest;
  const isOwnProfile = currentUserId === id;

  const handleFriendAction = async () => {
    setFriendLoading(true);
    if (isFriend) {
      await unfriend(id);
    } else if (isPending) {
      await cancelRequest(pendingRequest.id);
    } else {
      await sendRequest(id);
    }
    setFriendLoading(false);
  };

  const handleMessage = async () => {
    setMessaging(true);
    const chatId = await openOrCreateDM(id);
    setMessaging(false);
    if (chatId) router.push(`/chat/${chatId}` as any);
  };

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  const initials = (profile.display_name ?? profile.username ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = formatMemberSince(profile.created_at);
  const interests = CATEGORIES.filter((c) => selectedCategories.includes(c.id));

  const friendBtnLabel = isFriend ? 'Friends ✓' : isPending ? 'Requested' : 'Add Friend';
  const friendBtnFilled = !isFriend && !isPending;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Name & username */}
      <Text style={styles.displayName}>{profile.display_name ?? profile.username}</Text>
      {profile.username && (
        <Text style={styles.username}>@{profile.username}</Text>
      )}
      {profile.bio && (
        <Text style={styles.bio}>{profile.bio}</Text>
      )}

      {/* Meta row */}
      <View style={styles.metaRow}>
        {memberSince && (
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>Joined {memberSince}</Text>
          </View>
        )}
        {!profile.hide_quest_progress && profile.xp != null && (
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{profile.xp.toLocaleString()} XP</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {!isOwnProfile && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              friendBtnFilled ? styles.actionBtnFilled : styles.actionBtnOutline,
              friendLoading && styles.actionBtnDisabled,
            ]}
            onPress={handleFriendAction}
            disabled={friendLoading}
          >
            {friendLoading ? (
              <ActivityIndicator size="small" color={friendBtnFilled ? '#fff' : '#333'} />
            ) : (
              <Text style={[styles.actionBtnText, friendBtnFilled && styles.actionBtnTextLight]}>
                {friendBtnLabel}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline, messaging && styles.actionBtnDisabled]}
            onPress={handleMessage}
            disabled={messaging}
          >
            {messaging ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Text style={styles.actionBtnText}>Message</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Quest progress */}
      {!profile.hide_quest_progress && questProgress.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quests</Text>
          {questProgress.map((q) => (
            <View key={q.id} style={styles.questRow}>
              <View style={styles.questIcon}>
                <Text style={styles.questIconText}>🗺</Text>
              </View>
              <View style={styles.questInfo}>
                <Text style={styles.questTitle} numberOfLines={1}>{q.title}</Text>
                <Text style={styles.questMeta}>{q.steps} {q.steps === 1 ? 'stop' : 'stops'} visited</Text>
              </View>
              <View style={styles.questXpBadge}>
                <Text style={styles.questXpText}>+{q.xp} XP</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsGrid}>
            {interests.map((cat) => (
              <View key={cat.id} style={styles.interestChip}>
                <Text style={styles.interestEmoji}>{cat.emoji}</Text>
                <Text style={styles.interestLabel}>{cat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  bio: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  metaText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 28,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFilled: {
    backgroundColor: '#6C63FF',
  },
  actionBtnOutline: {
    backgroundColor: '#EFEFEF',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  actionBtnTextLight: {
    color: '#fff',
  },
  section: {
    width: '100%',
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F0FF',
    borderWidth: 1,
    borderColor: '#E0D6FF',
  },
  interestEmoji: {
    fontSize: 16,
  },
  interestLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C63FF',
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFEF',
    gap: 12,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questIconText: {
    fontSize: 18,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  questMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  questXpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F0EDFF',
  },
  questXpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C63FF',
  },
});

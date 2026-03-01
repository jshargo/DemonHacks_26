import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useSocialStore } from '@/stores/social-store';

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  rank: number;
  isCurrentUser: boolean;
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = useAuthStore((s) => s.session?.user?.id);
  const xpVersion = useAuthStore((s) => s.xpVersion);
  const friends = useSocialStore((s) => s.friends);

  const loadLeaderboard = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const friendIds = friends.map((f) => f.id);
      const allIds = [userId, ...friendIds];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, xp')
        .in('id', allIds);

      if (error) {
        console.warn('loadLeaderboard error:', error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      const sorted = [...data].sort((a, b) => {
        if ((b.xp ?? 0) !== (a.xp ?? 0)) return (b.xp ?? 0) - (a.xp ?? 0);
        return (a.username ?? '').localeCompare(b.username ?? '');
      });

      const ranked: LeaderboardEntry[] = sorted.map((user, index) => ({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        xp: user.xp ?? 0,
        rank: index + 1,
        isCurrentUser: user.id === userId,
      }));

      setEntries(ranked);
    } catch (err) {
      console.warn('loadLeaderboard exception:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, friends]);

  // Auto-refresh leaderboard when XP changes (skip initial mount)
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    loadLeaderboard();
  }, [xpVersion]);

  // Re-fetch when friends list changes so leaderboard includes them
  useEffect(() => {
    if (userId && friends.length > 0) {
      loadLeaderboard();
    }
  }, [friends.length, userId]);

  return { entries, loading, loadLeaderboard };
}

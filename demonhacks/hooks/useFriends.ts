import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useSocialStore } from '@/stores/social-store';
import type { UserProfile } from '@/lib/types';

export function useFriends() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const {
    setFriends,
    setPendingReceived,
    setPendingSent,
    setFriendsLoading,
  } = useSocialStore();

  /** Load current friends + pending requests */
  const loadFriends = useCallback(async () => {
    if (!userId) return;
    setFriendsLoading(true);

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:requester_id(id, username, display_name, avatar_url),
        addressee:addressee_id(id, username, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (error) {
      console.warn('loadFriends error:', error.message);
      setFriendsLoading(false);
      return;
    }
    if (!data) {
      setFriendsLoading(false);
      return;
    }

    const accepted: UserProfile[] = [];
    const received: typeof data = [];
    const sent: typeof data = [];

    for (const row of data) {
      if (row.status === 'accepted') {
        const other = row.requester_id === userId ? row.addressee : row.requester;
        if (other) accepted.push(other as unknown as UserProfile);
      } else if (row.status === 'pending') {
        if (row.addressee_id === userId) received.push(row);
        else sent.push(row);
      }
    }

    setFriends(accepted);
    setPendingReceived(received as any);
    setPendingSent(sent as any);
    setFriendsLoading(false);
  }, [userId]);

  /** Search profiles by username */
  const searchUsers = useCallback(async (query: string): Promise<UserProfile[]> => {
    if (!query.trim() || !userId) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', userId)
      .limit(20);
    if (error) console.warn('searchUsers error:', error.message);
    return (data ?? []) as UserProfile[];
  }, [userId]);

  /** Send a friend request */
  const sendRequest = useCallback(async (addresseeId: string) => {
    if (!userId) return;
    await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: addresseeId,
      status: 'pending',
    });
    await loadFriends();
  }, [userId, loadFriends]);

  /** Accept an incoming request */
  const acceptRequest = useCallback(async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    await loadFriends();
  }, [loadFriends]);

  /** Decline an incoming request */
  const declineRequest = useCallback(async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'declined' })
      .eq('id', friendshipId);
    await loadFriends();
  }, [loadFriends]);

  /** Remove an existing friend */
  const unfriend = useCallback(async (friendUserId: string) => {
    if (!userId) return;
    await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendUserId}),and(requester_id.eq.${friendUserId},addressee_id.eq.${userId})`);
    await loadFriends();
  }, [userId, loadFriends]);

  /** Cancel an outgoing friend request */
  const cancelRequest = useCallback(async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    await loadFriends();
  }, [loadFriends]);

  return { loadFriends, searchUsers, sendRequest, acceptRequest, declineRequest, unfriend, cancelRequest };
}

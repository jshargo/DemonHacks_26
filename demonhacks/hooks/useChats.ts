import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useSocialStore } from '@/stores/social-store';
import type { Message, SharedSpotMetadata } from '@/lib/types';

export function useChats() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const {
    activeChatId,
    setChats,
    setMessages,
    appendMessage,
    setChatsLoading,
    setMessagesLoading,
  } = useSocialStore();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /** Load all chats the user is a member of */
  const loadChats = useCallback(async () => {
    if (!userId) return;
    setChatsLoading(true);

    const { data, error } = await supabase.rpc('get_my_chats');
    if (error) console.warn('loadChats error:', error.message);
    if (data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      setChats(Array.isArray(parsed) ? parsed : []);
    }
    setChatsLoading(false);
  }, [userId]);

  /** Load messages for a specific chat */
  const loadMessages = useCallback(async (chatId: string) => {
    setMessagesLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, username, display_name, avatar_url)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data ?? []) as Message[]);
    setMessagesLoading(false);
  }, []);

  /** Subscribe to real-time new messages for a chat */
  const subscribeToChat = useCallback((chatId: string) => {
    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          // Fetch sender profile for the new message
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          appendMessage({
            ...(payload.new as Message),
            sender: senderData ?? undefined,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [appendMessage]);

  /** Unsubscribe from real-time */
  const unsubscribeFromChat = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  /** Send a text message */
  const sendMessage = useCallback(async (chatId: string, content: string) => {
    if (!userId) return;
    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: userId,
      type: 'text',
      content,
    });
    if (error) console.warn('sendMessage error:', error.message);
  }, [userId]);

  /** Share a spot or event into a chat */
  const shareSpot = useCallback(async (chatId: string, metadata: SharedSpotMetadata, type: 'spot' | 'event' = 'spot') => {
    if (!userId) return;
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: userId,
      type,
      content: null,
      metadata,
    });
  }, [userId]);

  /** Open or create a 1-on-1 DM with another user */
  const openOrCreateDM = useCallback(async (friendId: string): Promise<string | null> => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('create_dm_chat', { friend_id: friendId });
    if (error) {
      console.warn('[openOrCreateDM] rpc error', error.message);
      return null;
    }
    await loadChats();
    return data as string;
  }, [userId, loadChats]);

  /** Create a group chat */
  const createGroupChat = useCallback(async (name: string, memberIds: string[]): Promise<string | null> => {
    if (!userId) return null;

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({ type: 'group', name, created_by: userId })
      .select()
      .single();

    if (error || !newChat) return null;

    const allMembers = Array.from(new Set([userId, ...memberIds]));
    await supabase.from('chat_members').insert(
      allMembers.map((uid) => ({ chat_id: newChat.id, user_id: uid }))
    );

    await loadChats();
    return newChat.id;
  }, [userId, loadChats]);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => { unsubscribeFromChat(); };
  }, []);

  return {
    loadChats,
    loadMessages,
    subscribeToChat,
    unsubscribeFromChat,
    sendMessage,
    shareSpot,
    openOrCreateDM,
    createGroupChat,
  };
}

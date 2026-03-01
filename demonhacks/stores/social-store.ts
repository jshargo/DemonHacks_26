import { create } from 'zustand';
import type { Friendship, Chat, Message, UserProfile } from '@/lib/types';

interface SocialState {
  // Friends
  friends: UserProfile[];
  pendingReceived: Friendship[]; // requests others sent to me
  pendingSent: Friendship[];     // requests I sent

  // Chats
  chats: Chat[];

  // Active chat
  activeChatId: string | null;
  messages: Message[];

  // Tracks when each chat was last read (chatId -> ISO timestamp)
  lastReadAt: Record<string, string>;

  // Loading states
  friendsLoading: boolean;
  chatsLoading: boolean;
  messagesLoading: boolean;

  // Setters (called by hooks)
  setFriends: (friends: UserProfile[]) => void;
  setPendingReceived: (requests: Friendship[]) => void;
  setPendingSent: (requests: Friendship[]) => void;
  setChats: (chats: Chat[]) => void;
  setActiveChatId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  markChatRead: (chatId: string) => void;
  setFriendsLoading: (v: boolean) => void;
  setChatsLoading: (v: boolean) => void;
  setMessagesLoading: (v: boolean) => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  friends: [],
  pendingReceived: [],
  pendingSent: [],
  chats: [],
  activeChatId: null,
  messages: [],
  lastReadAt: {},
  friendsLoading: false,
  chatsLoading: false,
  messagesLoading: false,

  setFriends: (friends) => set({ friends }),
  setPendingReceived: (pendingReceived) => set({ pendingReceived }),
  setPendingSent: (pendingSent) => set({ pendingSent }),
  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId, messages: [] }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  markChatRead: (chatId) =>
    set((state) => ({ lastReadAt: { ...state.lastReadAt, [chatId]: new Date().toISOString() } })),
  setFriendsLoading: (friendsLoading) => set({ friendsLoading }),
  setChatsLoading: (chatsLoading) => set({ chatsLoading }),
  setMessagesLoading: (messagesLoading) => set({ messagesLoading }),
}));

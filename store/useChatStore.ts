import { create } from 'zustand';

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: Record<string, { displayName: string; photoURL: string }>;
  lastMessage?: string;
  lastMessageTimestamp?: number;
}

interface ChatState {
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConversation: null,
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  createdAt: string;
}

interface ChatStore {
  messages: Record<string, Message[]>; // channelId -> messages
  addMessage: (channelId: string, message: Message) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  clearMessages: (channelId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: {},
      addMessage: (channelId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: [...(state.messages[channelId] || []), message],
          },
        })),
      setMessages: (channelId, messages) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [channelId]: messages,
          },
        })),
      clearMessages: (channelId) =>
        set((state) => {
          const { [channelId]: _, ...rest } = state.messages;
          return { messages: rest };
        }),
    }),
    {
      name: "chatStore",
    }
  )
);

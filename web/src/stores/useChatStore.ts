import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
}

interface ChatStore {
  currentChatId: string | null;
  setCurrentChatId: (chatId: string | null) => void;
  participants: Record<string, User[]>; // chatId -> participants
  setParticipants: (chatId: string, participants: User[]) => void;
  oneOnOnePartner: Record<string, string>; // chatId -> other user id
  setOneOnOnePartner: (chatId: string, user: string) => void;
  clearChat: (chatId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      currentChatId: null,
      setCurrentChatId: (chatId) => set({ currentChatId: chatId }),
      participants: {},
      setParticipants: (chatId, participants) =>
        set((state) => ({
          participants: {
            ...state.participants,
            [chatId]: participants,
          },
        })),
      oneOnOnePartner: {},
      setOneOnOnePartner: (chatId, user) =>
        set((state) => ({
          oneOnOnePartner: {
            ...state.oneOnOnePartner,
            [chatId]: user,
          },
        })),
      clearChat: (chatId) =>
        set((state) => {
          const { [chatId]: _, ...remainingParticipants } = state.participants;
          const { [chatId]: __, ...remainingPartners } = state.oneOnOnePartner;
          return {
            participants: remainingParticipants,
            oneOnOnePartner: remainingPartners,
            currentChatId:
              state.currentChatId === chatId ? null : state.currentChatId,
          };
        }),
    }),
    {
      name: "chatStore",
    }
  )
);

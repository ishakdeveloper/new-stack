import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GuildStore {
  currentGuildId: string | null;
  setCurrentGuildId: (guildId: string | null) => void;
  currentChannelId: string | null;
  setCurrentChannelId: (channelId: string | null) => void;
  lastVisitedChannels: Record<string, string | null>;
  setLastVisitedChannel: (guildId: string, channelId: string) => void;
}

export const useGuildStore = create(
  persist<GuildStore>(
    (set, get) => ({
      currentGuildId: null,
      setCurrentGuildId: (guildId) => {
        const { lastVisitedChannels, setCurrentChannelId } = get();

        set({ currentGuildId: guildId });
        if (guildId) {
          const lastChannelId = lastVisitedChannels[guildId] || null;
          setCurrentChannelId(lastChannelId);
        }
      },
      currentChannelId: null,
      setCurrentChannelId: (channelId) => set({ currentChannelId: channelId }),
      lastVisitedChannels: {},
      setLastVisitedChannel: (guildId, channelId) =>
        set((state) => ({
          lastVisitedChannels: {
            ...state.lastVisitedChannels,
            [guildId]: channelId,
          },
        })),
    }),
    {
      name: "guildStore",
      partialize: (state) => {
        const { currentGuildId, currentChannelId, lastVisitedChannels } = state;
        return {
          currentGuildId,
          currentChannelId,
          lastVisitedChannels,
        } as GuildStore;
      },
    }
  )
);

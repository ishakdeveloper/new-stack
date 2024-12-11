import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GuildStore {
  currentGuildId: string | null;
  setCurrentGuildId: (guildId: string | null) => void;
  currentChannelId: string | null;
  setCurrentChannelId: (channelId: string | null) => void;
  lastVisitedChannels: Record<string, string | null>; // Track last visited channel per guild
  setLastVisitedChannel: (guildId: string, channelId: string) => void; // Update last visited channel for a guild
}

export const useGuildStore = create(
  persist<GuildStore>(
    (set, get) => ({
      currentGuildId: null,
      setCurrentGuildId: (guildId) => {
        const { lastVisitedChannels, setCurrentChannelId } = get();

        // Update the current guild and set the last visited channel for that guild
        set({ currentGuildId: guildId });
        if (guildId) {
          const lastChannelId = lastVisitedChannels[guildId] || null;
          setCurrentChannelId(lastChannelId);
        }
      },
      currentChannelId: null,
      setCurrentChannelId: (channelId) => set({ currentChannelId: channelId }),
      lastVisitedChannels: {}, // Initialize an empty object to track guild-channel mapping
      setLastVisitedChannel: (guildId, channelId) =>
        set((state) => ({
          lastVisitedChannels: {
            ...state.lastVisitedChannels,
            [guildId]: channelId, // Update the mapping for the specific guild
          },
        })),
    }),
    {
      name: "guildStore", // The key to store the data under in localStorage
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

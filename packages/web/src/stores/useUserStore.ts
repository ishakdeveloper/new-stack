import { create } from "zustand";

interface UserStore {
  currentUserId: string | null;
  setCurrentUserId: (userId: string) => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  currentUserId: null,
  setCurrentUserId: (userId: string) => set({ currentUserId: userId }),
}));

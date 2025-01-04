import { User } from "@repo/server/src/lib/auth";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserStore {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  clearStore: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user: User | null) => set({ currentUser: user }),
      clearStore: () => {
        localStorage.removeItem("userStore");
        set({ currentUser: null });
      },
    }),
    {
      name: "userStore",
    }
  )
);

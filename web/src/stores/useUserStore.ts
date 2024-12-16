import { User } from "@repo/server/src/lib/auth";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserStore {
  currentUser: Pick<User, "id" | "name" | "email" | "image"> | null;
  setCurrentUser: (
    user: Pick<User, "id" | "name" | "email" | "image"> | null
  ) => void;
  clearStore: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (
        user: Pick<User, "id" | "name" | "email" | "image"> | null
      ) => set({ currentUser: user }),
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

import { create } from "zustand";

const useAuthUserStore = create((set) => ({
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),
  logout: () => set({ authUser: null }),
}));

export default useAuthUserStore;

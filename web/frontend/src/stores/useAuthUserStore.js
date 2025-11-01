import { create } from "zustand";

const useAuthUserStore = create((set) => ({
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),
  // logout: () => set({ authUser: null }),
    logout: () => {
    localStorage.removeItem("user"); // xóa user trong localStorage
    set({ authUser: null }); // xóa trong Zustand
  },
}));

export default useAuthUserStore;

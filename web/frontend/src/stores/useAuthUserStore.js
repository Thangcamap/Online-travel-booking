import { create } from "zustand";

const useAuthUserStore = create((set) => {
  // 🟢 Khi khởi tạo store → lấy user đã lưu
  const storedUser = localStorage.getItem("user");
  return {
    authUser: storedUser ? JSON.parse(storedUser) : null,
    setAuthUser: (user) => set({ authUser: user }),
    logout: () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token"); // ❗ xóa token luôn
      set({ authUser: null });
    },
  };
});

export default useAuthUserStore;

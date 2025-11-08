import { socket } from "@/lib/socket";
import { toast } from "sonner";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { api } from "@/lib/api-client";

let initialized = false;

export const initUserSocket = () => {
  if (initialized) return;

  const { authUser, setAuthUser } = useAuthUserStore.getState();

  if (!authUser?.user_id) return;

  // 🔹 Kết nối socket
  socket.connect();
  socket.emit("join_user", authUser.user_id);
  console.log("✅ Joined socket room user_" + authUser.user_id);

  // --- Khi user bị khóa ---
  socket.on("account_status_changed", (newStatus) => {
    toast.warning(`Tài khoản của bạn đã bị ${newStatus}`);

    const updatedUser = { ...authUser, status: newStatus };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setAuthUser(updatedUser);
if (newStatus !== "active") {
  const currentPath = window.location.pathname;

  // 🔹 Chỉ logout nếu đang ở trang quản lý nhà cung cấp
  if (currentPath.includes("/provider-dashboard")) {
    localStorage.clear();
    setTimeout(() => (window.location.href = "/login"), 2000);
  } else {
    // 🔸 Nếu đang ở Home hoặc các trang khác thì chỉ cập nhật trạng thái user
    toast.warning("Tài khoản của bạn đã bị khóa. Một số tính năng sẽ bị hạn chế.");
  }
}
  });

  // --- Khi provider bị khóa hoặc mở lại ---
  socket.on("provider_status_changed", async (data) => {
    console.log("📢 Provider status changed:", data);

    if (data.newStatus === "suspended") {
      toast.error("Nhà cung cấp đã bị khóa, các tour sẽ bị ẩn!");
    } else if (data.newStatus === "active") {
      toast.success("Nhà cung cấp đã được mở khóa, tải lại tour...");

      try {
        await api.get("/home/tours"); // Gọi API để Home nhận update realtime
        window.dispatchEvent(new Event("provider_reactivated")); // 🔔 Gửi event global cho Home.jsx
      } catch (err) {
        console.error("❌ Lỗi reload tours:", err);
      }
    }
  });

  initialized = true;
};

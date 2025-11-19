import { socket } from "@/lib/socket";
import { toast } from "sonner";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { api } from "@/lib/api-client";

let joinedUserId = null; 
export const initUserSocket = () => {
  const { authUser, setAuthUser } = useAuthUserStore.getState();

  if (!authUser?.user_id) return;

  //  Nếu đã join cùng user_id rồi thì bỏ qua
  if (joinedUserId === authUser.user_id && socket.connected) {
    console.log("⚠️ Socket already joined for user:", authUser.user_id);
    return;
  }

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join_user", authUser.user_id);
  joinedUserId = authUser.user_id;
  console.log("✅ Joined socket room user_" + authUser.user_id);

  // --- Lắng nghe sự kiện tài khoản ---
  socket.removeAllListeners("account_status_changed");
  socket.on("account_status_changed", (newStatus) => {
    toast.warning(`Tài khoản của bạn đã bị ${newStatus}`);
    const updatedUser = { ...authUser, status: newStatus };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setAuthUser(updatedUser);

    if (newStatus !== "active") {
      const currentPath = window.location.pathname;
      if (currentPath.includes("/provider-dashboard")) {
        localStorage.clear();
        setTimeout(() => (window.location.href = "/login"), 2000);
      } else {
        toast.warning("Tài khoản của bạn đã bị khóa. Một số tính năng sẽ bị hạn chế.");
      }
    }
  });

  // --- Lắng nghe sự kiện provider ---
  socket.removeAllListeners("provider_status_changed");
  socket.on("provider_status_changed", async (data) => {
    console.log(" Provider status changed:", data);
    if (data.newStatus === "suspended") {
      toast.error("Nhà cung cấp đã bị khóa, các tour sẽ bị ẩn!");
    } else if (data.newStatus === "active") {
      toast.success("Nhà cung cấp đã được mở khóa, tải lại tour...");
      try {
        await api.get("/home/tours");
        window.dispatchEvent(new Event("provider_reactivated"));
      } catch (err) {
        console.error(" Lỗi reload tours:", err);
      }
    }
  });

  // --- Lắng nghe tin nhắn mới ---
socket.removeAllListeners("new_message");
socket.on("new_message", (message) => {
  console.log("📩 Tin nhắn mới:", message);

  // Nếu user hiện đang không mở khung chat thì thông báo
  if (!window.location.pathname.includes("/chat")) {
    toast.info(`📨 Tin nhắn mới từ ${message.sender === 'provider' ? "Nhà cung cấp" : "Bạn"}`);
  }

  // Gửi sự kiện global để UI chat cập nhật
  window.dispatchEvent(new CustomEvent("chat_message_received", { detail: message }));
});

};

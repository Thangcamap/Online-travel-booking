let io; // sẽ được gán khi khởi tạo

function initSocket(server) {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("join_user", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`✅ User ${userId} joined room user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
}

function notifyUserStatusChange(userId, newStatus) {
  if (io) {
    io.to(`user_${userId}`).emit("account_status_changed", newStatus);
    console.log(`📢 Sent update to user_${userId}: ${newStatus}`);
  }
}

function notifyProviderStatusChange(providerUserId, newStatus) {
  if (io) {
    io.to(`user_${providerUserId}`).emit("provider_status_changed", newStatus);
    console.log(`📢 Sent update to provider_${providerUserId}: ${newStatus}`);
  }
}

module.exports = { initSocket, notifyUserStatusChange, notifyProviderStatusChange };

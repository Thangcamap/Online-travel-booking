import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { socket } from "@/lib/socket";

export default function UserChat({ tour_id, user_id, provider_id }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!tour_id || !user_id || !provider_id) return;

    fetchHistory();

    // 👉 KẾT NỐI SOCKET
    socket.connect();

    // 👉 USER tham gia room riêng
    socket.emit("join_room", `user_${user_id}`);

    socket.on("new_message", (msg) => {
      // Chỉ push nếu đúng conversation hiện tại
      if (msg.user_id === user_id && msg.provider_id === provider_id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off("new_message");
      socket.disconnect();
    };
  }, [tour_id, user_id, provider_id]);

  // 👉 Lấy lịch sử tin nhắn
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`/chat/history`, {
        params: { tour_id, user_id, provider_id },
      });

      setMessages(res.data.messages || []);
    } catch (err) {
      console.log("History error:", err.response?.data || err);
    }
  };

  // 👉 Gửi tin nhắn
  const sendMessage = async () => {
    if (!content.trim()) return;

    try {
      const res = await axios.post("/chat/send", {
        tour_id: String(tour_id),
        user_id: String(user_id),
        provider_id: String(provider_id),
        sender: "user",
        content,
      });
      setMessages(prev => [...prev, res.data.message]);
      setContent("");
    } catch (err) {
      console.log("Send error:", err.response?.data || err);
    }
  };

  return (
    <div className="border rounded-lg w-full h-[400px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div
            key={m.message_id}
            className={`p-2 rounded-md max-w-[70%] ${
              m.sender === "user"
                ? "bg-orange-500 text-white ml-auto"
                : "bg-gray-200"
            }`}
          >
            {m.content}
            <div className="text-[10px] opacity-70 text-right">
              {new Date(m.created_at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t flex gap-2">
        <input
          value={content}
          placeholder="Nhập tin nhắn..."
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 px-2 py-1 border rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-orange-500 text-white px-4 rounded"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

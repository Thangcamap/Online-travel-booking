import { useState, useEffect, useRef } from "react";
import axios from "@/lib/axios";
import { socket } from "@/lib/socket";

export default function UserChat({ tour_id, user_id, provider_id }) {
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user_id || !provider_id) return;

    loadMessages();

    socket.emit("join_room", `user_${user_id}`);

    socket.on("new_message", (msg) => {
      if (msg.user_id === user_id && msg.provider_id === provider_id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("new_message");
  }, [user_id, provider_id]);

  const loadMessages = async () => {
    const res = await axios.get(`/chat/history`, {
      params: { user_id, provider_id }
    });

    setMessages(res.data.messages || []);
  };

  const sendMessage = async () => {
    if (!content.trim()) return;

    // 🧠 Lấy tour giống provider (từ tin nhắn cuối)
    const last = messages[messages.length - 1];
    const tourId = last?.tour_id ?? tour_id;

    if (!tourId) {
      alert("⚠ Không xác định được tour để chat.");
      return;
    }

    const res = await axios.post(`/chat/send`, {
      tour_id: String(tourId),
      user_id: String(user_id),
      provider_id: String(provider_id),
      sender: "user",
      content
    });

    setMessages((prev) => [...prev, res.data.message]);
    setContent("");
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[400px] border rounded-lg">

      {/* Header */}
      <div className="p-3 border-b font-semibold bg-white text-gray-800">
        🧳 Trò chuyện với nhà cung cấp
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto bg-gray-100">
        {messages.map((msg) => (
          <div key={msg.message_id} className="mb-2">

            {/* 🔥 Hiển thị tour giống Provider */}
            {msg.tour_name && (
              <div className="text-xs text-gray-500 mb-1">
                🏷 Tour: {msg.tour_name}
              </div>
            )}

            <div
              className={`max-w-[75%] px-3 py-2 rounded-lg ${
                msg.sender === "user"
                  ? "bg-orange-500 text-white ml-auto text-right"
                  : "bg-white border"
              }`}
            >
              {msg.content}
              <div className="text-[10px] opacity-70 mt-1">
                {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Nhập tin nhắn..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={sendMessage}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { sendMessageToUser, getChatHistory } from "../api/chat-api";
import { socket } from "@/lib/socket";

export default function ReplyModal({ providerId, tourId, userId, userName, onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  // Load lịch sử chat khi mở modal
  useEffect(() => {
    loadMessages();

    // Lắng nghe tin nhắn realtime
    socket.on("new_message", (msg) => {
      if (msg.user_id === userId && msg.provider_id === providerId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("new_message");
  }, []);

  const loadMessages = async () => {
    const res = await getChatHistory({ tour_id: tourId, user_id: userId, provider_id: providerId });
    setMessages(res);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const res = await sendMessageToUser({
      providerId,
      tourId,
      userId,
      message,
    });

    setMessages((prev) => [...prev, res.message]); // push UI ngay
    setMessage("");
  };

  // Scroll xuống cuối mỗi lần có tin nhắn
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-5 w-96 rounded shadow-lg">
        <h3 className="font-bold text-lg mb-3">Trả lời khách: {userName}</h3>

        {/* 🚀 Hiển thị lịch sử chat */}
        <div className="border p-3 h-64 overflow-y-auto rounded bg-gray-50 mb-3">
          {messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`max-w-[80%] px-3 py-2 rounded-lg mb-2 ${
                msg.sender === "provider"
                  ? "bg-blue-600 text-white ml-auto text-right"
                  : "bg-gray-300 text-black"
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={scrollRef}></div>
        </div>

        {/* Ô nhập tin nhắn */}
        <textarea
          className="w-full border p-2 rounded mb-3"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập nội dung..."
        />

        <div className="flex justify-end gap-3">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Hủy
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSend}>
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}

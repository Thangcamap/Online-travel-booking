import { useState, useEffect, useRef } from "react";
import { sendMessageToUser, getChatHistory } from "../api/chat-api";
import { socket } from "@/lib/socket";

export default function ChatWindow({ providerId, tourId, userId, userName }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadMessages();

    socket.on("new_message", (msg) => {
      if (msg.user_id === userId && msg.provider_id === providerId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("new_message");
  }, [userId]);

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
      message
    });

    setMessages((prev) => [...prev, res.message]);
    setMessage("");
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      
      {/* Header */}
      <div className="p-4 border-b font-semibold bg-white">
        💬 Đang trò chuyện với: {userName}
      </div>

      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {messages.map((msg) => (
          <div
            key={msg.message_id}
            className={`max-w-[75%] px-3 py-2 rounded-lg mb-2 ${
              msg.sender === "provider"
                ? "bg-blue-600 text-white ml-auto text-right"
                : "bg-gray-300 text-black"
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Nhập tin nhắn..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

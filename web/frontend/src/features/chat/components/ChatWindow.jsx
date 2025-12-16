import { useState, useEffect, useRef } from "react";
import { sendMessageToUser, getChatHistory } from "../api/chat-api";
import { socket } from "@/lib/socket";

export default function ChatWindow({ providerId, userId, userName }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (providerId) {
      socket.emit("join_provider", providerId);
    }
  }, [providerId]);

  useEffect(() => {
    if (!userId || !providerId) return;

    loadMessages();

    const handler = (msg) => {
      if (msg.user_id === userId && msg.provider_id === providerId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("new_message", handler);
    return () => socket.off("new_message", handler);
  }, [userId, providerId]);

  const loadMessages = async () => {
    try {
      const res = await getChatHistory({ user_id: userId, provider_id: providerId });
      setMessages(res || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const lastMessage = messages[messages.length - 1];
    const tourId = lastMessage?.tour_id;

    if (!tourId) {
      alert("Vui lòng chọn tour trước khi gửi tin nhắn");
      return;
    }

    try {
      await sendMessageToUser({
        providerId,
        userId,
        tourId,
        message
      });
      setMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const currentTour = lastMessage?.tour_name || "Chưa xác định";

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="font-bold text-base text-gray-900">{userName}</h2>
        <p className="text-xs text-gray-600 mt-1">{currentTour}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Chưa có tin nhắn</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isProvider = msg.sender === "provider";
            const showTour = index === 0 || messages[index - 1]?.tour_id !== msg.tour_id;

            return (
              <div key={msg.message_id}>
                {showTour && msg.tour_name && (
                  <p className="text-xs text-gray-500 text-center my-2"> {msg.tour_name}</p>
                )}
                <div className={`flex ${isProvider ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded ${
                      isProvider
                        ? "bg-orange-500 text-white border border-orange-500"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 border border-gray-200 px-3 py-2 text-sm rounded focus:outline-none focus:border-orange-400"
          />
          <button
            onClick={handleSend}
            className="bg-orange-500 text-white px-4 py-2 text-sm font-medium rounded hover:bg-orange-600"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
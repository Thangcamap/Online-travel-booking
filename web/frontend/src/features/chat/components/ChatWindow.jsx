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
    console.log("Provider joined room provider_", providerId);
  }
}, [providerId]);


useEffect(() => {
  if (!userId || !providerId) return;

  loadMessages();

  const handler = (msg) => {
    console.log(" Provider received realtime:", msg);

    if (msg.user_id === userId && msg.provider_id === providerId) {
      setMessages((prev) => [...prev, msg]);
    }
  };

  socket.on("new_message", handler);
  return () => socket.off("new_message", handler);
}, [userId, providerId]);


  const loadMessages = async () => {
    const res = await getChatHistory({ user_id: userId, provider_id: providerId });
    setMessages(res);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    //  Lấy tour từ tin nhắn cuối
    const lastMessage = messages[messages.length - 1];
    const tourId = lastMessage?.tour_id;

    if (!tourId) {
      alert("⚠ Không thể gửi tin nhắn vì chưa xác định tour mà khách đang hỏi.");
      return;
    }

    const res = await sendMessageToUser({
      providerId,
      userId,
      tourId,
      message
    });
    //setMessages((prev) => [...prev, res]);
    setMessage("");
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      
      {/* Header */}
      <div className="p-4 border-b font-semibold bg-white">
         Đang trò chuyện với: {userName}
      </div>

      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        {messages.map((msg) => (
          <div key={msg.message_id} className="mb-2">
            
            {/* Hiển thị tên Tour giống Shopee */}
            {msg.tour_name && (
              <div className="text-xs text-gray-500 mb-1">
                 Tour: {msg.tour_name}
              </div>
            )}

            <div
              className={`max-w-[75%] px-3 py-2 rounded-lg ${
                msg.sender === "provider"
                  ? "bg-orange-500 text-white ml-auto text-right"
                  : "bg-white border text-black"
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
      <div className="p-4 border-t bg-white flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder="Nhập tin nhắn..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

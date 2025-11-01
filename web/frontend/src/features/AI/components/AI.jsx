import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuthUserStore from "@/stores/useAuthUserStore";

const API_BASE_URL = "http://localhost:5000/api/ai";

export default function AIChat() {
  // 🟢 Lấy user từ Zustand hoặc localStorage
const { authUser } = useAuthUserStore();
const user_id = authUser?.user_id || null;


  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  // 🟡 Nếu chưa đăng nhập
  if (!user_id) {
    return (
      <div className="p-6 text-center text-gray-600 bg-white rounded-xl shadow-md">
        🔒 Vui lòng{" "}
        <a href="/login" className="text-blue-600 underline">
          đăng nhập
        </a>{" "}
        để sử dụng Trợ lý Du lịch thông minh.
      </div>
    );
  }

  // 🔄 Load lịch sử chat khi mở trang
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/history/${user_id}`);
        if (res.data.success) setMessages(res.data.messages);
      } catch (err) {
        console.error("Lỗi tải lịch sử:", err);
      }
    };
    fetchHistory();
  }, [user_id]);

  // 📩 Gửi tin nhắn
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg = { role: "user", message: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    try {
      const res = await axios.post(`${API_BASE_URL}/chat`, { user_id, message: input });
      if (res.data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", message: res.data.reply, tours: res.data.tours || [] },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", message: "❌ Lỗi khi xử lý yêu cầu." },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: "⚠️ Không thể kết nối đến máy chủ AI." },
      ]);
    }
  };

  const handleBook = (tour_id) => {
    window.location.href = `/book/${tour_id}`;
  };

  return (
    <div className="flex flex-col max-w-lg mx-auto bg-white rounded-xl shadow-lg p-4 mt-4 h-[70vh]">
      <h2 className="text-xl font-semibold text-blue-700 mb-3 text-center">
        🤖 Trợ lý du lịch thông minh
      </h2>

      {/* 💬 Khung chat */}
      <div className="flex-1 overflow-y-auto border p-3 rounded-lg bg-gray-50 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`p-2 rounded-lg inline-block max-w-[85%] ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.message}
            </div>

            {/* ✈️ Tour gợi ý */}
            {msg.tours && msg.tours.length > 0 && (
              <div className="grid grid-cols-1 gap-2 mt-2">
                {msg.tours.map((t, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg shadow-sm bg-white overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <img
                      src={t.image_url || "/default-tour.jpg"}
                      alt={t.name}
                      className="h-24 w-full object-cover"
                    />
                    <div className="p-2">
                      <h4 className="font-semibold text-sm text-gray-800 truncate">
                        {t.name}
                      </h4>
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {t.description}
                      </p>
                      <p className="text-blue-600 font-semibold mt-1 text-xs">
                        {t.price.toLocaleString()} {t.currency}
                      </p>
                      <button
                        onClick={() => handleBook(t.tour_id)}
                        className="mt-1 w-full bg-blue-600 text-white py-1 rounded-md text-xs hover:bg-blue-700 transition"
                      >
                        Đặt tour
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ✏️ Ô nhập tin nhắn */}
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 border rounded-lg p-2 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

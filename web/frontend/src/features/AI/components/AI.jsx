import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/ai";

export default function AIChat() {
  const user_id = "7qqx1wrxltm"; // user giả định
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  // 🔄 Load lịch sử khi mở trang
  useEffect(() => {
    const fetchHistory = async () => {
      const res = await axios.get(`${API_BASE_URL}/history/${user_id}`);
      if (res.data.success) setMessages(res.data.messages);
    };
    fetchHistory();
  }, []);

  // 📩 Gửi tin nhắn
  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg = { role: "user", message: input };
    setMessages([...messages, newMsg]);
    setInput("");

    const res = await axios.post(`${API_BASE_URL}/chat`, { user_id, message: input });

    if (res.data.success) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: res.data.reply, tours: res.data.tours || [] },
      ]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", message: "❌ Lỗi khi xử lý." }]);
    }
  };

  const handleBook = (tour_id) => {
    window.location.href = `/book/${tour_id}`;
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-5 mt-6 h-[85vh]">
      <h2 className="text-2xl font-semibold text-blue-700 mb-3 text-center">
        🤖 Trợ lý du lịch thông minh
      </h2>

      {/* 💬 Khung chat */}
      <div className="flex-1 overflow-y-auto border p-4 rounded-lg bg-gray-50 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`p-3 rounded-lg inline-block max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.message}
            </div>

            {/* Nếu có tour gợi ý */}
            {msg.tours && msg.tours.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {msg.tours.map((t, idx) => (
                  <div
                    key={idx}
                    className="border rounded-xl shadow-sm bg-white overflow-hidden w-64 hover:shadow-lg transition"
                  >
                    <img
                      src={t.image_url || "/default-tour.jpg"}
                      alt={t.name}
                      className="h-40 w-full object-cover"
                    />
                    <div className="p-3">
                      <h4 className="font-semibold text-lg">{t.name}</h4>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {t.description}
                      </p>
                      <p className="text-blue-600 font-semibold mt-1">
                        {t.price.toLocaleString()} {t.currency}
                      </p>
                      <button
                        onClick={() => handleBook(t.tour_id)}
                        className="mt-2 w-full bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 transition"
                      >
                        Đặt tour ngay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 🧾 Ô nhập */}
      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 border rounded-lg p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

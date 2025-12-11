import React, { useEffect, useState } from "react";
import axios from "axios";
import useAuthUserStore from "@/stores/useAuthUserStore";
import { Loader2 } from "lucide-react"; // 🔄 Import icon loading

const API_BASE_URL = "http://localhost:5000/api/ai";

export default function AIChat() {
  const { authUser } = useAuthUserStore();
  const user_id = authUser?.user_id || null;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // ⏳ Thêm state loading

  if (!user_id) {
    return (
      <div className="p-8 text-center text-gray-600 bg-white rounded-2xl shadow-xl border border-orange-200">
        🔒 Vui lòng{' '}
        <a href="/login" className="text-orange-500 font-semibold underline hover:text-orange-600 transition">
          đăng nhập
        </a>{' '}
        để sử dụng Trợ lý Du lịch thông minh.
      </div>
    );
  }

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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return; // ⛔ Chặn gửi khi đang loading
    
    const newMsg = { role: "user", message: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsLoading(true); // 🔄 Bật loading

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
    } finally {
      setIsLoading(false); // ✅ Tắt loading
    }
  };

  const handleBook = (tour_id) => {
    window.location.href = `/tours/${tour_id}`;
  };

  return (
    <div className="flex flex-col w-full bg-white rounded-2xl shadow-2xl border border-orange-200 p-4 h-[65vh]">
      <div className="flex-1 overflow-y-auto border border-orange-100 p-4 rounded-xl bg-gray-50 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`${msg.role === "user" ? "text-right" : "text-left"}`}> 
            <div
              className={`p-3 rounded-xl inline-block max-w-[85%] font-medium shadow ${
                msg.role === "user"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-800 border border-orange-100"
              }`}
            >
              {msg.message}
            </div>

            {msg.tours && msg.tours.length > 0 && (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {msg.tours.map((t, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl shadow-lg border border-orange-100 overflow-hidden hover:shadow-2xl transition-all duration-200"
                  >
                    <img
                      src={t.image_url || "/src/assets/images/default-tour.jpg"}
                      alt={t.name}
                      className="h-28 w-full object-cover"
                    />
                    <div className="p-3">
                      <h4 className="font-bold text-base text-orange-500 truncate mb-1">
                        {t.name}
                      </h4>
                      <p className="text-gray-700 text-sm line-clamp-2 mb-2">
                        {t.description}
                      </p>
                      <p className="text-orange-500 font-semibold text-sm">
                        {t.price.toLocaleString()} {t.currency}
                      </p>
                      <button
                        onClick={() => handleBook(t.tour_id)}
                        className="mt-2 w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
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

        {/* ⏳ Hiển thị khi AI đang trả lời */}
        {isLoading && (
          <div className="text-left">
            <div className="p-3 rounded-xl inline-block bg-white text-gray-800 border border-orange-100 shadow">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-sm font-medium">AI đang trả lời...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✏️ Ô nhập tin nhắn */}
      <div className="mt-4 flex gap-2">
        <input
          className={`flex-1 border border-orange-300 rounded-xl p-3 text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-base transition ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage()}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className={`px-5 py-3 rounded-xl font-bold text-base shadow transition flex items-center gap-2 ${
            isLoading || !input.trim()
              ? "bg-orange-300 text-white cursor-not-allowed opacity-60"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang gửi...</span>
            </>
          ) : (
            "Gửi"
          )}
        </button>
      </div>
    </div>
  );
}
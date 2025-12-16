import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { socket } from "@/lib/socket";

export default function ProviderConversationList({ providerId, onSelect }) {
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();

    socket.on("new_message", (msg) => {
      if (msg.provider_id === providerId) loadConversations();
    });

    return () => socket.off("new_message");
  }, [providerId]);

  const loadConversations = async () => {
    try {
      const res = await axios.get(`/chat/conversations/provider/${providerId}`);
      setList(res.data.conversations || []);
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const filteredList = list.filter((item) =>
    item.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = list.reduce((sum, item) => sum + (item.unread_count || 0), 0);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="font-bold text-base text-gray-900 mb-3">Tin nhắn</h2>
        <input
          type="text"
          placeholder="Tìm kiếm khách..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-400"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Không có tin nhắn</p>
          </div>
        ) : (
          filteredList.map((item) => (
            <button
              key={item.user_id}
              onClick={() => onSelect?.(item)}
              className="w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{item.user_name}</h3>
                  <p className="text-xs text-gray-600 truncate mt-1">{item.last_message || "Bắt đầu trò chuyện"}</p>
                  {item.last_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.last_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                </div>
                {item.unread_count > 0 && (
                  <span className="text-orange-500 text-xs font-bold ml-2 flex-shrink-0">
                    {item.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
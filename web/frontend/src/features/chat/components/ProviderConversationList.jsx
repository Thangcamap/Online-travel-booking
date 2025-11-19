import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { socket } from "@/lib/socket";

export default function ProviderConversationList({ providerId, onSelect }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    loadConversations();

    socket.on("new_message", (msg) => {
      if (msg.provider_id === providerId) loadConversations();
    });

    return () => socket.off("new_message");
  }, []);

  const loadConversations = async () => {
    const res = await axios.get(`/chat/conversations/provider/${providerId}`);
    setList(res.data.conversations);
  };

  return (
    <div className="w-full border h-full overflow-y-auto rounded">
      <h2 className="font-bold text-lg p-3 border-b bg-gray-100">
        Tin nhắn khách gửi
      </h2>

      {list.map((item) => (
        <button
          key={item.user_id}
          onClick={() => onSelect && onSelect(item)}
          className="w-full text-left p-3 hover:bg-gray-50 cursor-pointer border-b flex justify-between"
        >
          <div>
            <div className="font-semibold">{item.user_name}</div>
            <div className="text-xs text-gray-500">{item.last_message}</div>
          </div>

          {item.unread_count > 0 && (
            <span className="bg-red-500 text-white px-2 text-xs rounded-full">
              {item.unread_count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

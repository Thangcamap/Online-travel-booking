import { api } from "@/lib/api-client";

export const sendMessage = async (messageData) => {
  const { data } = await api.post("/chat/send", messageData);
  return data;
};

export const getChatHistory = async ({ tour_id, user_id, provider_id }) => {
  const { data } = await api.get("/chat/history", {
    params: { tour_id, user_id, provider_id },
  });
  return data.messages;
};

export const getProviderConversations = async (provider_id) => {
  const { data } = await api.get(`/chat/conversations/provider/${provider_id}`);
  return data.conversations;
};

export const sendMessageToUser = async ({ providerId, userId, tourId, message }) => {
  const res = await api.post("/chat/send", {
    provider_id: providerId,
    user_id: userId,
    tour_id: tourId,
    sender: "provider",
    content: message,
  });

  return res.data;
};


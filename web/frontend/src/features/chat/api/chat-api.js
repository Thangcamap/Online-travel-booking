import { api } from "@/lib/api-client";

export const sendMessage = async ({ userId, providerId, tourId, content }) => {
  const { data } = await api.post("/chat/send", {
    user_id: userId,
    provider_id: providerId,
    tour_id: tourId,
    content,
    sender: "user",
  });

  return data.message;
};


export const getChatHistory = async ({ user_id, provider_id }) => {
  const { data } = await api.get("/chat/history", {
    params: { user_id, provider_id },
  });
  return data.messages ?? [];
};



export const getProviderConversations = async (provider_id) => {
  const { data } = await api.get(`/chat/conversations/provider/${provider_id}`);
  return data.conversations;
};

export const sendMessageToUser = async ({ providerId, userId, tourId, message }) => {
  const { data } = await api.post("/chat/send", {
    provider_id: providerId,
    user_id: userId,
    tour_id: tourId,
    sender: "provider",
    content: message,
  });

  return data.message;
};



import axios from "axios";

const API_URL = "http://localhost:5000/api/admins";

// ✅ Lấy danh sách provider đang chờ duyệt
export const getPendingProviders = async () => {
  const res = await axios.get(`${API_URL}/providers/pending`);
  return res.data.providers;
};

// ✅ Duyệt hoặc từ chối provider
export const updateProviderStatus = async (id, status) => {
  const res = await axios.put(`${API_URL}/providers/${id}/approve`, { status });
  return res.data;
};

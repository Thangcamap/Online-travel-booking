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
// ✅ Lấy danh sách tất cả user
export const getAllUsers = async () => {
  const res = await axios.get(`${API_URL}/users`);
  return res.data.users;
};

// ✅ Cập nhật trạng thái user
export const updateUserStatus = async (id, status) => {
  const res = await axios.put(`${API_URL}/users/${id}/status`, { status });
  return res.data;
};
// ✅ Lấy danh sách tất cả provider (kèm số tour, doanh thu, ảnh,...)
export const getAllProviders = async () => {
  const res = await axios.get(`${API_URL}/providers`);
  return res.data.providers;
};
// ✅ Lấy danh sách tất cả tour của hệ thống
export const getAllTours = async () => {
  const res = await axios.get(`${API_URL}/tours`);
  return res.data.tours;
};


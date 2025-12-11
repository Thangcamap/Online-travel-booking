import axios from "axios";

const API_BASE = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";
const pointsApi = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// Interceptor để tự động gắn token
pointsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers.Accept = "application/json";
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================
// 📊 Lấy điểm của user
// =========================================================
export const getUserPoints = async (user_id) => {
  try {
    const res = await pointsApi.get(`/points/user/${user_id}`);
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching user points:", error);
    throw error;
  }
};

// =========================================================
// 📋 Lấy lịch sử giao dịch điểm
// =========================================================
export const getPointTransactions = async (user_id, limit = 50, offset = 0) => {
  try {
    const res = await pointsApi.get(`/points/user/${user_id}/transactions`, {
      params: { limit, offset }
    });
    return res.data;
  } catch (error) {
    console.error("❌ Error fetching point transactions:", error);
    throw error;
  }
};

// =========================================================
// ➖ Sử dụng điểm
// =========================================================
export const usePoints = async (user_id, points, description, source_id = null) => {
  try {
    const res = await pointsApi.post(`/points/user/${user_id}/use`, {
      points,
      description,
      source_id
    });
    return res.data;
  } catch (error) {
    console.error("❌ Error using points:", error);
    throw error;
  }
};

export default pointsApi;


// frontend/src/features/payments/api/payments.js
import axios from "axios";

// ✅ Base URL đọc từ .env (ví dụ: http://localhost:5000)
const API_BASE = `${import.meta.env.VITE_APP_API_URL || "http://localhost:5000"}/api/payments`;

// ✅ Axios instance riêng cho module payments
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // nếu backend dùng cookie hoặc session
});

// ✅ Interceptor: tự động gắn token + header chung
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers.Accept = "application/json";
    return config;
  },
  (error) => Promise.reject(error)
);

// ==============================
// 🔧 Helper: Lấy email từ localStorage
// ==============================
const getUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.email || null;
  } catch {
    return null;
  }
};

// ==============================
// 🧾 CÁC API THANH TOÁN CHÍNH
// ==============================

// 🔹 Lấy danh sách thanh toán theo user email
export const fetchPayments = async (email = null) => {
  const userEmail = email || getUserEmail();
  if (!userEmail) throw new Error("Không tìm thấy email người dùng (chưa đăng nhập)");
  const res = await api.get(`/?email=${encodeURIComponent(userEmail)}`);
  // backend có thể trả {data: [...]} hoặc mảng trực tiếp, nên cần xử lý an toàn
  return res.data?.data || res.data || [];
};

// 🔹 Xác nhận thanh toán
export const confirmPayment = async (id) => {
  const res = await api.patch(`/${id}/confirm`);
  return res.data;
};

// 🔹 Cập nhật thông tin thanh toán
export const updatePayment = async (id, payload) => {
  const res = await api.put(`/${id}`, payload);
  return res.data;
};

// 🔹 Xóa thanh toán
export const deletePayment = async (id) => {
  const res = await api.delete(`/${id}`);
  return res.data;
};

// 🔹 Lấy chi tiết hóa đơn
export const fetchInvoice = async (id) => {
  const res = await api.get(`/${id}/invoice`);
  return res.data;
};

// 🔹 Upload ảnh xác minh thanh toán (QR, chuyển khoản, v.v.)
export const uploadPaymentImage = async (id, file) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post(`/upload/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ✅ Export default để các file khác có thể dùng axios instance chung
export default api;

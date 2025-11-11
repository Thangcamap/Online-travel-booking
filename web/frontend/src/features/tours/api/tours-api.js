import axios from "axios";

// 🟢 Base URL khớp đúng với backend: /api/tours
const API_BASE = "http://localhost:5000/api/tours";

// 🧩 Tạo axios instance riêng cho module Tours
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// 🪄 Tự động thêm token nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers.Accept = "application/json";
    return config;
  },
  (error) => Promise.reject(error)
);

/* ================================
   🚀 CÁC HÀM GỌI API TOUR
================================ */

// 📘 Lấy danh sách tour công khai
export const fetchTours = async () => {
  const res = await api.get("/");
  return res.data;
};

// 📘 Lấy chi tiết 1 tour
export const fetchTourById = async (tourId) => {
  const res = await api.get(`/${tourId}`);
  return res.data;
};

// 📘 Tạo tour mới
export const createTour = async (tourData) => {
  const res = await api.post("/", tourData);
  return res.data;
};

// 📘 Cập nhật tour
export const updateTour = async (tourId, tourData) => {
  const res = await api.put(`/${tourId}`, tourData);
  return res.data;
};

// 📘 Xóa tour
export const deleteTour = async (tourId) => {
  const res = await api.delete(`/${tourId}`);
  return res.data;
};

// 📘 Upload ảnh cho tour
export const uploadTourImage = async (tourId, file) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post(`/${tourId}/upload-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// 📘 Lấy lịch trình
export const fetchItinerary = async (tourId) => {
  const res = await api.get(`/${tourId}/itinerary`);
  return res.data;
};

// 📘 Cập nhật lịch trình
export const updateItinerary = async (tourId, itineraryData) => {
  const res = await api.put(`/${tourId}/itinerary`, itineraryData);
  return res.data;
};

// 📘 Lấy danh sách tour của provider
export const fetchToursByProvider = async (providerId) => {
  const res = await api.get(`/provider/${providerId}`);
  return res.data;
};

export default api;

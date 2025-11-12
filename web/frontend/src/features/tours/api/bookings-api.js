import axios from "axios";

const API_BASE = import.meta.env.VITE_APP_API_URL || "http://localhost:5000/api";

const bookingApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/* =========================================================
   🧾 Tạo booking mới
========================================================= */
export const createBooking = async (bookingData) => {
  const res = await bookingApi.post("/bookings", bookingData);
  return res.data;
};

/* =========================================================
   📋 Lấy danh sách booking theo user
========================================================= */
export const fetchBookingsByUser = async (userId) => {
  const res = await bookingApi.get(`/bookings/user/${userId}`);
  return res.data.bookings;
};

/* =========================================================
   🔍 Lấy chi tiết booking (kèm tour, ảnh, lịch trình)
========================================================= */
export const fetchBookingDetail = async (bookingId) => {
  const res = await bookingApi.get(`/bookings/${bookingId}`);
  return res.data.booking;
};

/* =========================================================
   💳 Cập nhật trạng thái booking
========================================================= */
export const updateBookingStatus = async (bookingId, status) => {
  const res = await bookingApi.put(`/bookings/${bookingId}/status`, { status });
  return res.data;
};

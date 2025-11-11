import axios from "axios";

const API_BASE = import.meta.env.VITE_APP_API_URL || "http://localhost:5000/api";

const bookingApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export const createBooking = async (bookingData) => {
  const res = await bookingApi.post("/bookings", bookingData);
  return res.data;
};

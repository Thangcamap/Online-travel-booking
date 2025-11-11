import axios from "axios";

const API_BASE =
  import.meta.env.VITE_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // ✅ giữ nếu backend bật CORS credentials
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers.Accept = "application/json";
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetchAbout = async () => {
  const res = await api.get("/about");
  return res.data;
};

export default api;

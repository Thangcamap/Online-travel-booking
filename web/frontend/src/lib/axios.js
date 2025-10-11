import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // cần cho login/session
});

// 🧩 Interceptor để tự xử lý header cho FormData
instance.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    // Bỏ header JSON để axios tự set multipart/form-data
    delete config.headers["Content-Type"];
  } else {
    // Giữ JSON cho các request thông thường
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

export default instance;

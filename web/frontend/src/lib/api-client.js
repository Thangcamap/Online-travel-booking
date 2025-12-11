import axios from "axios";

function authRequestInterceptor(config) {
  if (config.headers) {
    config.headers.Accept = "application/json";
  }
  config.withCredentials = true;
  return config;
}

// Đảm bảo baseURL đúng format
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_APP_API_URL;
  if (envURL) {
    return envURL.endsWith("/api") ? envURL : `${envURL}/api`;
  }
  return "http://localhost:5000/api";
};

export const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(authRequestInterceptor);
// 🟢 CUSTOM TOKEN HANDLER 
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// NOTE: This is a workaround for the issue with axios interceptors
let isRefeshing = false;
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    console.log("error", error);
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      error.response.data?.errorType === "REFRESH_TOKEN_EXPIRED"
    ) {
      if (!isRefeshing) {
        isRefeshing = true;
        try {
          const { status } = await api.post(
            "/v1/auth/refreshToken",
            {},
            {
              withCredentials: true,
            },
          );
          if (status === 201) {
            console.log("refresh token success");
            return api(originalRequest);
          }
        } catch (refreshError) {
          const searchParams = new URLSearchParams();
          console.log("redirectTo");
          const redirectTo = searchParams.get("redirectTo") || window.location.pathname;
          window.location.href = `/login?redirectTo=${redirectTo}`;
          return Promise.reject(refreshError);
        } finally {
          isRefeshing = false;
        }
      }
    }
        // 🟠 CUSTOM TOKEN EXPIRED HANDLER
    // Chỉ redirect nếu không phải đang ở trang login/register
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === "/login" || currentPath === "/register";
      
      if (!isAuthPage) {
        console.warn("⚠️ Token hết hạn hoặc không hợp lệ, tự động logout...");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

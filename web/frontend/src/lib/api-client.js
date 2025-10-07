import axios from "axios";

function authRequestInterceptor(config) {
  if (config.headers) {
    config.headers.Accept = "application/json";
  }
  config.withCredentials = true;
  return config;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL + "/api",
});

api.interceptors.request.use(authRequestInterceptor);
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
    return Promise.reject(error);
  },
);

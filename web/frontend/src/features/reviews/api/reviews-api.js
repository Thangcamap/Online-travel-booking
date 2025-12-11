import axios from "axios";

// Đảm bảo baseURL có /api ở cuối
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_APP_API_URL;
  if (envURL) {
    return envURL.endsWith("/api") ? envURL : `${envURL}/api`;
  }
  return "http://localhost:5000/api";
};

const reviewsApi = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================================================
   ⭐ Tạo review mới
========================================================= */
export const createReview = async (reviewData) => {
  try {
    console.log("API: Creating review with data:", reviewData);
    const res = await reviewsApi.post("/reviews", reviewData);
    console.log("API: Review response:", res.data);
    return res.data;
  } catch (error) {
    console.error("API: Review creation error:", error);
    console.error("API: Error response:", error.response?.data);
    throw error;
  }
};

/* =========================================================
   📋 Lấy danh sách reviews của tour
========================================================= */
export const getTourReviews = async (tour_id) => {
  const res = await reviewsApi.get(`/reviews/tour/${tour_id}`);
  return res.data;
};

/* =========================================================
   📋 Lấy tất cả reviews của user
========================================================= */
export const getUserReviews = async (user_id, limit = 50, offset = 0) => {
  console.log("API: Getting user reviews:", { user_id, limit, offset });
  const res = await reviewsApi.get(`/reviews/user/${user_id}`, {
    params: { limit, offset }
  });
  console.log("API: User reviews response:", res.data);
  return res.data;
};

/* =========================================================
   📋 Lấy review của user cho tour cụ thể
========================================================= */
export const getUserReviewForTour = async (user_id, tour_id) => {
  const res = await reviewsApi.get(`/reviews/user/${user_id}/tour/${tour_id}`);
  return res.data;
};

/* =========================================================
   🗑️ Xóa review
========================================================= */
export const deleteReview = async (review_id, user_id) => {
  const res = await reviewsApi.delete(`/reviews/${review_id}`, {
    data: { user_id },
  });
  return res.data;
};


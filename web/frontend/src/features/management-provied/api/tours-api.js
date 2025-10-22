import axios from "@/lib/axios";

// 🟢 Lấy tất cả tour của provider
export const getTours = async (providerId) => {
  if (!providerId) throw new Error("Thiếu providerId khi gọi getTours");
  return axios.get(`/tours/provider/${providerId}`);
};

// 🟢 Tạo mới tour
export const createTour = (data) => axios.post("/tours", data);

// 🟢 Cập nhật thông tin tour
export const updateTour = (tourId, data) => {
  if (!tourId) throw new Error("Thiếu tourId khi gọi updateTour");
  return axios.put(`/tours/${tourId}`, data);
};

// 🟢 Xóa tour
export const deleteTour = (tourId, providerId) => {
  if (!tourId || !providerId) throw new Error("Thiếu tourId hoặc providerId khi gọi deleteTour");
  return axios.delete(`/tours/${tourId}`, { data: { provider_id: providerId } });
};

// 🟢 Upload ảnh tour
export const uploadTourImage = async (tourId, file, providerId) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("provider_id", providerId);
  return await axios.post(`/tours/${tourId}/upload-image`, formData);
};

// 🟢 Lấy danh sách ảnh của tour
export const getTourImages = (tourId) => {
  if (!tourId) throw new Error("Thiếu tourId khi gọi getTourImages");
  return axios.get(`/tours/${tourId}/images`);
};

// 🟢 Xóa ảnh của tour
export const deleteTourImage = (imageId) => {
  if (!imageId) throw new Error("Thiếu imageId khi gọi deleteTourImage");
  return axios.delete(`/images/${imageId}`);
};

// 🟢 Tạo mới lịch trình tour
export const createTourItinerary = (tourId, itinerary) => {
  if (!tourId) throw new Error("Thiếu tourId khi gọi createTourItinerary");
  return axios.post(`/tours/${tourId}/itinerary`, { itinerary });
};

// 🟢 Lấy lịch trình tour
export const getTourItinerary = (tourId) => axios.get(`/tours/${tourId}/itinerary`);

// 🟢 Cập nhật lịch trình tour
export const updateTourItinerary = (tourId, itinerary) =>
  axios.put(`/tours/${tourId}/itinerary`, { itinerary });


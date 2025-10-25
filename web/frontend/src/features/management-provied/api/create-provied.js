import axios from "axios";

// ✅ Dùng biến môi trường thay vì cố định localhost
const BASE_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/api/providers`;

// 🧾 Gửi yêu cầu tạo provider mới
// export const createProvider = async (data) => {
//   try {
//     const res = await axios.post(API_URL, data);
//     return res; // ❗ giữ nguyên toàn bộ response để frontend đọc được res.data.data.providerId
//   } catch (error) {
//     console.error("❌ Lỗi khi tạo provider:", error);
//     throw error;
//   }
// };
export const createProvider = async (data) => {
  try {
    // // ✅ thêm user_id test
    // const requestData = {
    //   ...data,
    //   user_id: "u_test001", // <-- id bạn đã chèn tay vào DB
    // };

    const res = await axios.post(API_URL, data);
    return res;
  } catch (error) {
    console.error("❌ Lỗi khi tạo provider:", error);
    throw error;
  }
};


// 🖼️ Upload ảnh logo & cover cho provider
export const uploadProviderImage = async ({ providerId, images }) => {
  const formData = new FormData();

  // ✅ Tên field phải trùng với backend (logo & cover)
  if (images.logo) formData.append("avatar", images.logo);
  if (images.cover) formData.append("cover", images.cover);

  try {
    const res = await axios.post(`${API_URL}/${providerId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  } catch (error) {
    console.error("❌ Lỗi khi upload ảnh:", error);
    throw error;
  }
};
// 📌 Kiểm tra provider theo userId
export const getProviderByUser = async (userId) => {
  const res = await axios.get(`${API_URL}/user/${userId}`);
  return res.data;
};

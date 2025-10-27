import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/ai";

export const getAISuggestion = async (user_id, preference) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/suggest`, {
      user_id,
      preference,
    });
    return res.data;
  } catch (error) {
    console.error("❌ Lỗi gọi API AI:", error);
    return { success: false, message: "Không thể kết nối đến máy chủ AI." };
  }
};

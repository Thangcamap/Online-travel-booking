import axios from "axios";

const API_URL = "http://localhost:5000/api/login";

// ✅ Đăng nhập
export const loginUser = async (username, password) => {
  const res = await axios.post(API_URL, { username, password });
  return res.data; // trả về thông tin user hoặc token (nếu backend có)
};

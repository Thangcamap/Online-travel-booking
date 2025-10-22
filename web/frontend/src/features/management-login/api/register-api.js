import axios from "axios";

const API_URL = "http://localhost:5000/api/register";

// ✅ Đăng ký tài khoản
export const registerUser = async (formData) => {
  const res = await axios.post(API_URL, formData);
  return res.data; // trả về message hoặc thông báo thành công
};

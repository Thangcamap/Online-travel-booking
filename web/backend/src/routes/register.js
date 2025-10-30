const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../../config/mysql");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { fullname, email, phone, username, password, confirmPassword } = req.body;

    // 🧱 Kiểm tra đủ thông tin
    if (!fullname || !email || !phone || !username || !password || !confirmPassword)
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });

    // 🧩 Kiểm tra mật khẩu khớp
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Mật khẩu xác nhận không khớp!" });

    // 🧩 Kiểm tra trùng email
    const [checkEmail] = await pool.query("SELECT 1 FROM users WHERE email = ?", [email]);
    if (checkEmail.length > 0)
      return res.status(400).json({ message: "Email đã được sử dụng!" });

    // 🧩 Kiểm tra trùng số điện thoại
    const [checkPhone] = await pool.query("SELECT 1 FROM users WHERE phone_number = ?", [phone]);
    if (checkPhone.length > 0)
      return res.status(400).json({ message: "Số điện thoại đã được sử dụng!" });

    // 🧩 Kiểm tra trùng username
    const [checkUsername] = await pool.query("SELECT 1 FROM users WHERE name = ?", [username]);
    if (checkUsername.length > 0)
      return res.status(400).json({ message: "Tên đăng nhập đã được sử dụng!" });

    // 🧱 Tạo tài khoản
    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id = Math.random().toString(36).substring(2, 18);

    await pool.query(
      `INSERT INTO users (user_id, name, email, password, phone_number, role)
       VALUES (?, ?, ?, ?, ?, 'user')`,
      [user_id, username, email, hashedPassword, phone]
    );

    // ✅ Trả về phản hồi
    return res.status(200).json({
      message: "Đăng ký thành công! Hãy đăng nhập để bắt đầu hành trình.",
    });
  } catch (error) {
    console.error("❌ Lỗi đăng ký:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi đăng ký." });
  }
});

module.exports = router;

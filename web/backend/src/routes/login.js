const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // 🧩 thêm dòng này
const { pool } = require("../../config/mysql");

const router = express.Router();
const SECRET_KEY = "AI_TRAVEL_SECRET"; // 🧩 bạn có thể để trong .env

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Vui lòng nhập tài khoản và mật khẩu." });

    // ✅ Cho phép login bằng email, username, hoặc số điện thoại
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR name = ? OR phone_number = ?",
      [username, username, username]
    );

    if (!rows.length)
      return res.status(401).json({ message: "Không tìm thấy người dùng hoặc sai thông tin đăng nhập." });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Mật khẩu không đúng." });

    // ✅ Tạo token có hiệu lực 1 ngày
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role }, // payload
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    // ✅ Không trả password
    const safeUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      avatar_url: user.avatar_url || null,
      role: user.role,
      status: user.status,
    };

    console.log("✅ Login successful for user:", safeUser.user_id);

    return res.status(200).json({
      message: "Đăng nhập thành công!",
      user: safeUser,
      token, // 👈 gửi token về frontend
    });
  } catch (error) {
    console.error("❌ Lỗi đăng nhập:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: "Lỗi server khi đăng nhập.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

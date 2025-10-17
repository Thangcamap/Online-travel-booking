const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require("../../config/mysql");

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { fullname, email, phone, password, confirmPassword } = req.body;

    if (!fullname || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' });

    if (password !== confirmPassword)
      return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp!' });

    // Kiểm tra trùng email hoặc số điện thoại
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR phone_number = ?',
      [email, phone]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: 'Email hoặc số điện thoại đã được sử dụng!' });

    // Mã hóa mật khẩu
    const hashed = await bcrypt.hash(password, 10);
    const user_id = Math.random().toString(36).substring(2, 18);

    await pool.query(
      `INSERT INTO users (user_id, name, email, password, phone_number, role)
       VALUES (?, ?, ?, ?, ?, 'user')`,
      [user_id, fullname, email, hashed, phone]
    );

    res.status(200).json({ message: 'Đăng ký thành công! Hãy đăng nhập.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Lỗi server khi đăng ký.' });
  }
});

module.exports = router;

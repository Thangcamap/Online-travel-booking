const express = require('express');
const bcrypt = require('bcrypt');

function loginRoute(db) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng cung cấp tài khoản và mật khẩu.' });
      }

      // Cho phép đăng nhập bằng email, tên, hoặc số điện thoại
      const [rows] = await db
        .promise()
        .query(
          'SELECT * FROM users WHERE email = ? OR name = ? OR phone_number = ? LIMIT 1',
          [username, username, username]
        );

      if (!rows.length) {
        return res.status(401).json({ message: 'Không tìm thấy người dùng hoặc sai thông tin đăng nhập.' });
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Mật khẩu không đúng.' });
      }

      const safeUser = {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
      };

      return res.status(200).json({ message: 'Đăng nhập thành công!', user: safeUser });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
    }
  });

  return router;
}

module.exports = loginRoute;

// backend/src/routes/chat.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");
const { v4: uuidv4 } = require("uuid");
const socketModule = require("../../socket"); // đường dẫn tới file socket.js của bạn

// GỬI tin nhắn -> lưu DB + emit realtime
router.post("/send", async (req, res) => {
  try {
    const { tour_id, user_id, provider_id, sender, content } = req.body;
    if (!tour_id || !user_id || !provider_id || !sender || !content) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
    }

    const message_id = "msg_" + Date.now(); // hoặc uuidv4();
    const [result] = await pool.query(
      `INSERT INTO messages (message_id, tour_id, user_id, provider_id, sender, content)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [message_id, tour_id, user_id, provider_id, sender, content]
    );

    const message = {
      message_id,
      tour_id,
      user_id,
      provider_id,
      sender,
      content,
      created_at: new Date().toISOString()
    };

    // emit realtime tới cả 2 bên
const io = socketModule.getIO();
if (io) {
  io.to(`user_${user_id}`).emit("new_message", message);
  io.to(`provider_${provider_id}`).emit("new_message", message);
}

    res.json({ success: true, message });
  } catch (err) {
    console.error("POST /chat/send error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Lấy lịch sử conversation theo tour + user + provider (hoặc tất cả conversation cho provider)
router.get("/history", async (req, res) => {
  try {
    const { user_id, provider_id, limit = 200 } = req.query;

    if (!user_id || !provider_id)
      return res.status(400).json({ success: false, message: "Thiếu tham số" });

    const [rows] = await pool.query(
      `SELECT m.message_id, m.tour_id, t.name AS tour_name,
              m.user_id, m.provider_id, m.sender, m.content,
              m.read_flag, m.created_at
       FROM messages m
       LEFT JOIN tours t ON t.tour_id = m.tour_id
       WHERE m.user_id = ? AND m.provider_id = ?
       ORDER BY m.created_at ASC
       LIMIT ?`,
      [user_id, provider_id, Number(limit)]
    );

    res.json({ success: true, messages: rows });
  } catch (err) {
    console.error("GET /chat/history error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Lấy danh sách conversation (chỉ cho provider) — trả user_id + last message + count unread
router.get("/conversations/provider/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;

    const [rows] = await pool.query(
      `SELECT 
    m.user_id,
    u.name AS user_name,
    MAX(m.created_at) AS last_at,
    (
      SELECT content 
      FROM messages 
      WHERE user_id = m.user_id AND provider_id = ? 
      ORDER BY created_at DESC LIMIT 1
    ) AS last_message,
    SUM(CASE WHEN m.read_flag = 0 AND m.sender = 'user' THEN 1 ELSE 0 END) AS unread_count
FROM messages m
JOIN users u ON u.user_id = m.user_id
WHERE m.provider_id = ?
GROUP BY m.user_id, u.name
ORDER BY last_at DESC;
`,
      [providerId, providerId]
    );

    res.json({ success: true, conversations: rows });
  } catch (err) {
    console.error("GET /chat/conversations error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



module.exports = router;

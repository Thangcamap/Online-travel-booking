const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { pool } = require("../../config/mysql");

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const SECRET_KEY = process.env.JWT_SECRET || "AI_TRAVEL_SECRET";

router.post("/", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }

    // ✅ Verify token từ Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // ✅ Check user trong DB
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let user;

    if (rows.length === 0) {
      // 🆕 User mới
      const user_id = Math.random().toString(36).substring(2, 18);

      await pool.query(
        `INSERT INTO users (user_id, name, email, password, role, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, name, email, null,"user", picture]
      );

      user = {
        user_id,
        name,
        email,
        role: "user",
        avatar_url: picture,
      };
    } else {
      user = rows[0];
    }

    // ✅ JWT của hệ thống mày
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login Google success",
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      token,
    });
  } catch (err) {
    console.error("❌ Google login error:", err);
    return res.status(401).json({ message: "Google authentication failed" });
  }
});

module.exports = router;

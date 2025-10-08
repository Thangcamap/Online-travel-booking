// backend/routes/payments.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

// 📌 Lấy tất cả payments (join users + tours)
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.payment_id, p.amount, p.method, p.status, 
             u.name AS user_name, t.name AS tour_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN tours t ON b.tour_id = t.tour_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Xác nhận thanh toán
router.patch("/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;

    // cập nhật payments
    await pool.query("UPDATE payments SET status='paid' WHERE payment_id=?", [id]);

    // đồng thời cập nhật bookings liên quan
    await pool.query(
      "UPDATE bookings SET status='confirmed' WHERE booking_id=(SELECT booking_id FROM payments WHERE payment_id=?)",
      [id]
    );

    res.json({ message: "✅ Payment confirmed & booking updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

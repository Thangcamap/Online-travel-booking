const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "@Quang12345", // đổi nếu khác
  database: "tour_booking_db",
  port: 3306,
});

app.get("/", (req, res) => {
  res.send("Smart Tourism API is running 🚀");
});

// 📌 API danh sách thanh toán
app.get("/api/payments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.payment_id, p.amount, p.method, p.status, p.confirmed_at,
        u.user_id, u.name AS user_name, 
        t.name AS tour_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN tours t ON b.tour_id = t.tour_id
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 API xác nhận thanh toán
app.patch("/api/payments/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE payments SET status='paid', confirmed_at = NOW() WHERE payment_id=?", [id]);
    await pool.query(
      "UPDATE bookings SET status='confirmed' WHERE booking_id=(SELECT booking_id FROM payments WHERE payment_id=?)",
      [id]
    );
    res.json({ message: "✅ Payment confirmed & booking updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 API chi tiết hóa đơn
app.get("/api/payments/:id/invoice", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(`
      SELECT 
        p.payment_id, p.amount, p.method, p.status, 
        p.created_at AS created_at, p.confirmed_at,
        u.user_id AS customer_id, u.name AS customer_name, u.email, u.phone_number,
        t.name AS tour_name, t.description AS tour_desc, t.start_date, t.end_date,
        tp.company_name AS provider_name, tp.email AS provider_email, tp.phone_number AS provider_phone,
        b.booking_id, b.booking_date
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN tours t ON b.tour_id = t.tour_id
      JOIN tour_providers tp ON t.provider_id = tp.provider_id
      WHERE p.payment_id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 API sửa hóa đơn (chỉ sửa khi chưa thanh toán)
app.put("/api/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { method, amount } = req.body;

    const [check] = await pool.query("SELECT status FROM payments WHERE payment_id=?", [id]);
    if (check.length === 0) return res.status(404).json({ error: "Payment not found" });
    if (check[0].status !== "unpaid") return res.status(400).json({ error: "Cannot edit a paid invoice" });

    await pool.query("UPDATE payments SET method=?, amount=? WHERE payment_id=?", [method, amount, id]);
    res.json({ message: "✅ Invoice updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 API xóa hóa đơn (chỉ xóa khi chưa thanh toán)
app.delete("/api/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [check] = await pool.query("SELECT status FROM payments WHERE payment_id=?", [id]);
    if (check.length === 0) return res.status(404).json({ error: "Payment not found" });
    if (check[0].status !== "unpaid") return res.status(400).json({ error: "Cannot delete a paid invoice" });

    await pool.query("DELETE FROM payments WHERE payment_id=?", [id]);
    res.json({ message: "✅ Invoice deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../../config/mysql");

// ===========================================
// 🔧 TẠO THƯ MỤC LƯU ẢNH THANH TOÁN
// ===========================================
const uploadDir = path.join(__dirname, "../../uploads/payments");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ⚙️ Cấu hình multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ===========================================
// 📋 LẤY DANH SÁCH THANH TOÁN (lọc theo email người dùng)
// ===========================================
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Thiếu email người dùng trong query" });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        p.payment_id,
        u.name AS user_name,
        t.name AS tour_name,
        p.amount,
        p.method,
        p.status,
        p.payment_image,
        p.created_at,
        p.updated_at
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN tours t ON b.tour_id = t.tour_id
      WHERE u.email = ?
      ORDER BY p.created_at DESC
      `,
      [email]
    );

    if (rows.length === 0) {
      return res.json({ message: "Không có hóa đơn thuộc tài khoản của bạn.", data: [] });
    }

    res.json({ data: rows });
  } catch (err) {
    console.error("❌ [GET /payments] Lỗi khi truy vấn DB:", err.sqlMessage || err.message);
    res.status(500).json({
      error: "Lỗi khi tải danh sách thanh toán",
      details: err.sqlMessage || err.message,
    });
  }
});

// ===========================================
// ✅ XÁC NHẬN THANH TOÁN
// ===========================================
router.patch("/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "UPDATE payments SET status='paid', updated_at=NOW() WHERE payment_id=?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Không tìm thấy thanh toán cần xác nhận" });

    res.json({ message: "✅ Thanh toán đã được xác nhận!" });
  } catch (err) {
    console.error("❌ [PATCH /confirm] Lỗi:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Lỗi xác nhận thanh toán", details: err.sqlMessage || err.message });
  }
});

// ===========================================
// ✏️ CẬP NHẬT THÔNG TIN THANH TOÁN
// ===========================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;

    if (!amount || !method)
      return res.status(400).json({ error: "Thiếu dữ liệu cần cập nhật (amount hoặc method)" });

    const [result] = await pool.query(
      "UPDATE payments SET amount=?, method=?, updated_at=NOW() WHERE payment_id=?",
      [amount, method, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Không tìm thấy thanh toán cần cập nhật" });

    res.json({ message: "✅ Đã cập nhật thông tin thanh toán" });
  } catch (err) {
    console.error("❌ [PUT /payments/:id] Lỗi:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Không thể cập nhật thanh toán", details: err.sqlMessage || err.message });
  }
});

// ===========================================
// ❌ XÓA THANH TOÁN
// ===========================================
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM payments WHERE payment_id=?", [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Không tìm thấy thanh toán để xóa" });

    res.json({ message: "🗑️ Đã xóa thanh toán thành công" });
  } catch (err) {
    console.error("❌ [DELETE /payments] Lỗi:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Không thể xóa thanh toán", details: err.sqlMessage || err.message });
  }
});

// ===========================================
// 🧾 HÓA ĐƠN CHI TIẾT
// ===========================================
router.get("/:id/invoice", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        p.payment_id,
        p.amount,
        p.method,
        p.status,
        p.created_at,
        p.updated_at AS confirmed_at,
        u.name AS customer_name,
        u.email,
        u.phone_number,
        t.name AS tour_name,
        t.start_date,
        t.end_date,
        pr.company_name AS provider_name,
        pr.email AS provider_email,
        pr.phone_number AS provider_phone
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.booking_id
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN tours t ON b.tour_id = t.tour_id
      LEFT JOIN tour_providers pr ON t.provider_id = pr.provider_id
      WHERE p.payment_id = ?
      `,
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Không tìm thấy hóa đơn với ID này" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ [GET /invoice] Lỗi:", err.sqlMessage || err.message);
    res.status(500).json({ error: "Lỗi tải hóa đơn", details: err.sqlMessage || err.message });
  }
});

// ===========================================
// 📸 UPLOAD ẢNH THANH TOÁN
// ===========================================
router.post("/upload/:id", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Thiếu file upload" });

    const filePath = `/uploads/payments/${req.file.filename}`;
    const [result] = await pool.query(
      "UPDATE payments SET payment_image=?, updated_at=NOW() WHERE payment_id=?",
      [filePath, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Không tìm thấy thanh toán để cập nhật ảnh" });

    res.json({
      message: "📸 Upload ảnh thanh toán thành công!",
      imageUrl: filePath,
    });
  } catch (err) {
    console.error("❌ [POST /upload] Lỗi upload:", err);
    res.status(500).json({ error: "Lỗi khi upload ảnh thanh toán", details: err.sqlMessage || err.message });
  }
});

module.exports = router;

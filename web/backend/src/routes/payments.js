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
    const { email, user_id } = req.query;
    
    if (!email && !user_id) {
      return res.status(400).json({ error: "Thiếu email hoặc user_id trong query" });
    }

    console.log("📝 GET /payments - Query params:", { email, user_id });

    // Kiểm tra xem bảng payments có cột payment_image không
    const [paymentColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'payments' 
       AND COLUMN_NAME = 'payment_image'`
    );
    
    const hasPaymentImage = paymentColumns.length > 0;
    console.log("📊 Payments table has payment_image column:", hasPaymentImage);

    // Kiểm tra xem bảng bookings có cột tour_name không
    const [bookingColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'bookings' 
       AND COLUMN_NAME = 'tour_name'`
    );
    
    const hasTourName = bookingColumns.length > 0;
    console.log("📊 Bookings table has tour_name column:", hasTourName);

    // Tạo query động dựa trên cột có sẵn
    const paymentImageField = hasPaymentImage ? "p.payment_image," : "NULL AS payment_image,";
    
    // Tạo tour_name field động
    const tourNameField = hasTourName 
      ? "COALESCE(t.name, b.tour_name, 'Tour không xác định') AS tour_name,"
      : "COALESCE(t.name, 'Tour không xác định') AS tour_name,";

    // Query với email hoặc user_id - sử dụng LEFT JOIN để tránh mất dữ liệu
    let query, params;
    if (user_id) {
      query = `
      SELECT 
        p.payment_id,
        p.booking_id,
        COALESCE(u.name, 'N/A') AS user_name,
        ${tourNameField}
        COALESCE(p.amount, 0) AS amount,
        COALESCE(p.method, 'online') AS method,
        COALESCE(p.status, 'unpaid') AS status,
        ${paymentImageField}
        p.created_at,
        p.updated_at,
        COALESCE(
          (SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=COALESCE(t.tour_id, b.tour_id) LIMIT 1),
          '/uploads/default-tour.jpg'
        ) AS image_url
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.booking_id
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN tours t ON b.tour_id = t.tour_id
      WHERE b.user_id = ?
      ORDER BY p.created_at DESC
      `;
      params = [user_id];
    } else {
      query = `
      SELECT 
        p.payment_id,
        p.booking_id,
        COALESCE(u.name, 'N/A') AS user_name,
        ${tourNameField}
        COALESCE(p.amount, 0) AS amount,
        COALESCE(p.method, 'online') AS method,
        COALESCE(p.status, 'unpaid') AS status,
        ${paymentImageField}
        p.created_at,
        p.updated_at,
        COALESCE(
          (SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=COALESCE(t.tour_id, b.tour_id) LIMIT 1),
          '/uploads/default-tour.jpg'
        ) AS image_url
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.booking_id
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN tours t ON b.tour_id = t.tour_id
      WHERE u.email = ?
      ORDER BY p.created_at DESC
      `;
      params = [email];
    }

    const [rows] = await pool.query(query, params);
    
    console.log("📊 Found payments:", rows.length, "for", email || user_id);
    console.log("📊 Query used:", query.substring(0, 100) + "...");
    console.log("📊 Params:", params);
    
    // Debug: Kiểm tra payments có tồn tại không
    if (rows.length === 0) {
      // Thử query đơn giản hơn để debug
      const [debugRows] = await pool.query(
        `SELECT p.*, b.user_id, u.email 
         FROM payments p 
         LEFT JOIN bookings b ON p.booking_id = b.booking_id 
         LEFT JOIN users u ON b.user_id = u.user_id 
         ORDER BY p.created_at DESC LIMIT 5`
      );
      console.log("🔍 Debug - Last 5 payments:", debugRows);
      
      return res.json({ 
        message: "Không có hóa đơn thuộc tài khoản của bạn.", 
        data: [],
        debug: process.env.NODE_ENV === 'development' ? { 
          searchFor: email || user_id,
          lastPayments: debugRows 
        } : undefined
      });
    }

    res.json({ data: rows });
  } catch (err) {
    console.error("❌ [GET /payments] Lỗi khi truy vấn DB:", err.sqlMessage || err.message);
    console.error("❌ Error details:", err);
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
    console.log("📝 PATCH /payments/:id/confirm - Payment ID:", id);
    
    // Kiểm tra xem payment có tồn tại không
    const [checkPayment] = await pool.query(
      "SELECT payment_id, status FROM payments WHERE payment_id = ?",
      [id]
    );
    
    if (checkPayment.length === 0) {
      console.error("❌ Payment not found:", id);
      return res.status(404).json({ error: "Không tìm thấy thanh toán cần xác nhận" });
    }
    
    console.log("📊 Payment found:", checkPayment[0]);
    
    // Kiểm tra xem bảng payments có cột status không
    const [statusColumns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'payments' 
       AND COLUMN_NAME = 'status'`
    );
    
    if (statusColumns.length === 0) {
      console.error("❌ Column 'status' does not exist in payments table");
      return res.status(500).json({ 
        error: "Cột 'status' không tồn tại trong bảng payments. Vui lòng kiểm tra database schema." 
      });
    }
    
    const [result] = await pool.query(
      "UPDATE payments SET status='paid', updated_at=NOW() WHERE payment_id=?",
      [id]
    );

    console.log("📊 Update result:", result);

    if (result.affectedRows === 0) {
      console.error("❌ No rows affected. Payment ID:", id);
      return res.status(404).json({ error: "Không thể cập nhật thanh toán. Vui lòng kiểm tra lại." });
    }

    console.log("✅ Payment confirmed successfully:", id);
    res.json({ success: true, message: "✅ Thanh toán đã được xác nhận!" });
  } catch (err) {
    console.error("❌ [PATCH /confirm] Lỗi:", err);
    console.error("❌ Error details:", {
      message: err.message,
      sqlMessage: err.sqlMessage,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState
    });
    res.status(500).json({ 
      error: "Lỗi xác nhận thanh toán", 
      details: err.sqlMessage || err.message 
    });
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

    // Kiểm tra xem bảng payments có cột payment_image không
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'payments' 
       AND COLUMN_NAME = 'payment_image'`
    );
    
    if (columns.length === 0) {
      return res.status(400).json({ 
        error: "Tính năng upload ảnh thanh toán chưa được hỗ trợ. Cột payment_image không tồn tại trong database." 
      });
    }

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

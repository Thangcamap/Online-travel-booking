const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");
const { notifyUserStatusChange, notifyProviderStatusChange } = require("../../socket");



// ✅ Lấy danh sách provider chờ duyệt
router.get("/providers/pending", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tour_providers WHERE approval_status = 'pending'"
    );
    res.json({ success: true, providers: rows });
  } catch (error) {
    console.error("❌ Error fetching pending providers:", error);
    res.status(500).json({ success: false, error: "Server error." });
  }
});
// ✅ Lấy danh sách tất cả providers kèm số lượng tour và doanh thu
router.get("/providers", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        tp.provider_id,
        tp.company_name,
        tp.email,
        tp.phone_number,
        tp.logo_url,
        tp.cover_url,
        tp.status,
        tp.approval_status,
        u.name AS owner_name,
        COUNT(DISTINCT t.tour_id) AS total_tours,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM tour_providers tp
      JOIN users u ON tp.user_id = u.user_id
      LEFT JOIN tours t ON tp.provider_id = t.provider_id
      LEFT JOIN bookings b ON t.tour_id = b.tour_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'paid'
      GROUP BY tp.provider_id
      ORDER BY tp.created_at DESC
    `);

    res.json({ success: true, providers: rows });
  } catch (error) {
    console.error("❌ Error fetching all providers:", error);
    res.status(500).json({ success: false, error: "Server error fetching providers." });
  }
});


//  Admin duyệt hoặc từ chối provider
router.put("/providers/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' hoặc 'rejected'

    await pool.query(
  `UPDATE tour_providers 
   SET approval_status = ?, 
       status = CASE WHEN ? = 'rejected' THEN 'inactive' ELSE status END
   WHERE provider_id = ?`,
  [status, status, id]
);
    notifyProviderStatusChange(id, status);


    res.json({ success: true, message: `Provider ${status} successfully.` });
  } catch (error) {
    console.error("❌ Error updating provider approval:", error);
    res.status(500).json({ success: false, error: "Server error updating approval." });
  }
});
//  Lấy danh sách tất cả người dùng
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT user_id, name, email, phone_number, role, status, created_at FROM users"
    );
    res.json({ success: true, users: rows });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ success: false, error: "Server error fetching users." });
  }
});
//  Cập nhật trạng thái user
//  Cập nhật trạng thái user + đồng bộ provider/tour
router.put("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'inactive', 'suspended'

    //  Cập nhật user trước
    await pool.query("UPDATE users SET status = ? WHERE user_id = ?", [status, id]);

    if (status !== "active") {
      //  Khi khóa user: khóa luôn provider & tour
      await pool.query(
        "UPDATE tour_providers SET status = 'suspended' WHERE user_id = ?",
        [id]
      );

      await pool.query(
        `UPDATE tours 
         SET available = 0 
         WHERE provider_id IN (SELECT provider_id FROM tour_providers WHERE user_id = ?);`,
        [id]
      );
    } else {
      //  Khi mở lại user: mở luôn provider & tour nếu có
      await pool.query(
        `UPDATE tour_providers 
         SET status = 'active' 
         WHERE user_id = ? AND approval_status = 'approved';`, // chỉ mở lại provider đã được duyệt
        [id]
      );

      await pool.query(
        `UPDATE tours 
         SET available = 1 
         WHERE provider_id IN (
            SELECT provider_id FROM tour_providers 
            WHERE user_id = ? AND approval_status = 'approved'
         );`,
        [id]
      );
    }
   // 🔁 Lấy danh sách tất cả provider thuộc user đó
const [providers] = await pool.query(
  "SELECT provider_id FROM tour_providers WHERE user_id = ?",
  [id]
);

// 🟢 Gửi socket update cho từng provider_id
for (const provider of providers) {
  notifyProviderStatusChange(provider.provider_id, status);
}

    res.json({ success: true, message: `User and related data updated to ${status}` });
  } catch (error) {
    console.error("❌ Error updating user status:", error);
    res.status(500).json({ success: false, error: "Server error updating user status." });
  }
});


//  Lấy danh sách tất cả tour và tổng doanh thu hệ thống
router.get("/tours", async (req, res) => {
  try {
    const [tours] = await pool.query(`
      SELECT 
        t.tour_id,
        t.name,
        t.price,
        t.provider_id,
        COUNT(b.booking_id) AS total_bookings,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM tours t
      JOIN tour_providers tp ON t.provider_id = tp.provider_id
      LEFT JOIN bookings b ON t.tour_id = b.tour_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'paid'
      WHERE tp.status = 'active' AND tp.approval_status = 'approved'
      GROUP BY t.tour_id
    `);

    res.json({ success: true, tours });
  } catch (error) {
    console.error("❌ Error fetching tours:", error);
    res.status(500).json({ success: false, error: "Server error fetching tours." });
  }
});

/// Quang them chuc nang lien quan den payment
//  QUẢN LÝ THANH TOÁN (ADMIN DASHBOARD)
router.get("/payments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.payment_id,
        p.booking_id,
        p.amount,
        p.method,
        p.status,
        p.payment_image,
        p.created_at,
        p.updated_at,
        u.name AS user_name,
        u.email AS user_email,
        u.phone_number AS user_phone,
        t.name AS tour_name,
        tp.company_name AS provider_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN tours t ON b.tour_id = t.tour_id
      JOIN tour_providers tp ON t.provider_id = tp.provider_id
      ORDER BY p.created_at DESC
    `);

    //  Thêm BASE_URL để tạo đường dẫn ảnh đầy đủ
    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
    const payments = rows.map((p) => ({
      ...p,
      payment_image: p.payment_image
        ? `${BASE_URL}/${p.payment_image.replace(/^\/+/, "")}`
        : null,
    }));

    res.json({ success: true, payments });
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    res.status(500).json({ success: false, error: "Server error fetching payments." });
  }
});



//  CẬP NHẬT TRẠNG THÁI THANH TOÁN (Admin xác minh thủ công)
router.put("/payments/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "paid" hoặc "unpaid"

    // Cập nhật trạng thái
    const [result] = await pool.query(
      `UPDATE payments SET status = ?, updated_at = NOW() WHERE payment_id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Payment not found." });
    }

    res.json({
      success: true,
      message: `Payment ${id} updated to ${status}.`,
    });
  } catch (error) {
    console.error("❌ Error updating payment status:", error);
    res.status(500).json({ success: false, error: "Server error updating payment status." });
  }
});


//  LẤY CHI TIẾT MỘT THANH TOÁN (có ảnh, user, tour)
router.get("/payments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT 
        p.payment_id,
        p.amount,
        p.method,
        p.status,
        p.payment_image,
        p.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.phone_number,
        t.name AS tour_name,
        t.start_date,
        t.end_date,
        tp.company_name AS provider_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.booking_id
      JOIN users u ON b.user_id = u.user_id
      JOIN tours t ON b.tour_id = t.tour_id
      JOIN tour_providers tp ON t.provider_id = tp.provider_id
      WHERE p.payment_id = ?
      `,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, error: "Payment not found" });

    res.json({ success: true, payment: rows[0] });
  } catch (error) {
    console.error("❌ Error fetching payment detail:", error);
    res.status(500).json({ success: false, error: "Server error fetching payment detail." });
  }
});

module.exports = router;

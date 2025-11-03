const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");

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


// ✅ Admin duyệt hoặc từ chối provider
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


    res.json({ success: true, message: `Provider ${status} successfully.` });
  } catch (error) {
    console.error("❌ Error updating provider approval:", error);
    res.status(500).json({ success: false, error: "Server error updating approval." });
  }
});
// ✅ Lấy danh sách tất cả người dùng
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
// ✅ Cập nhật trạng thái user
router.put("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'inactive', 'suspended'

    await pool.query("UPDATE users SET status = ? WHERE user_id = ?", [status, id]);

    // ✅ Nếu user bị khóa hoặc tạm ngưng
    if (status !== "active") {
      // 1️⃣ Khóa luôn provider tương ứng
      await pool.query(
        "UPDATE tour_providers SET status = 'suspended' WHERE user_id = ?",
        [id]
      );

      // 2️⃣ Ẩn tất cả tour của provider đó
      await pool.query(
        `UPDATE tours 
         SET available = 0 
         WHERE provider_id IN (SELECT provider_id FROM tour_providers WHERE user_id = ?)`,
        [id]
      );
    }

    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (error) {
    console.error("❌ Error updating user status:", error);
    res.status(500).json({ success: false, error: "Server error updating user status." });
  }
});

// ✅ Lấy danh sách tất cả tour và tổng doanh thu hệ thống
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
      LEFT JOIN bookings b ON t.tour_id = b.tour_id
      LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'paid'
      GROUP BY t.tour_id
    `);

    res.json({ success: true, tours });
  } catch (error) {
    console.error("❌ Error fetching tours:", error);
    res.status(500).json({ success: false, error: "Server error fetching tours." });
  }
});


module.exports = router;

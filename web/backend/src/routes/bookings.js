const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");

/* =========================================================
   🧾 API: Tạo mới booking (khi user bấm "Đặt Tour Ngay")
========================================================= */
router.post("/", async (req, res) => {
  try {
    const { user_id, tour_id, quantity, total_price, status } = req.body;

    if (!user_id || !tour_id)
      return res.status(400).json({ error: "Thiếu user_id hoặc tour_id trong request." });

    await pool.query(
      `INSERT INTO bookings (user_id, tour_id, quantity, total_price, status, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user_id, tour_id, quantity || 1, total_price, status || "pending"]
    );

    const [latestBooking] = await pool.query(
      `SELECT booking_id FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    if (latestBooking.length === 0)
      return res.status(500).json({ error: "Không tìm thấy booking mới tạo." });

    const booking_id = latestBooking[0].booking_id;

    await pool.query(
      `INSERT INTO payments (payment_id, booking_id, amount, method, status, created_at)
       VALUES (
         CONCAT('PAY', LPAD(FLOOR(RAND() * 9999), 4, '0')),
         ?, ?, 'online', 'unpaid', NOW()
       )`,
      [booking_id, total_price]
    );

    res.json({
      success: true,
      booking_id,
      message: "🎉 Đặt tour thành công và đã tạo hóa đơn thanh toán!",
    });
  } catch (error) {
    console.error("❌ Lỗi tạo booking:", error);
    res.status(500).json({ error: "Lỗi khi đặt tour" });
  }
});

/* =========================================================
   📋 API: Lấy danh sách booking của user
========================================================= */
router.get("/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
         b.booking_id,
         b.tour_id,
         b.user_id,
         b.quantity,
         b.total_price,
         b.status,
         b.created_at,
         t.name AS tour_name,
         t.description AS tour_description,
         i.image_url
       FROM bookings b
       JOIN tours t ON b.tour_id = t.tour_id
       LEFT JOIN images i ON i.entity_id = t.tour_id AND i.entity_type = 'tour'
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [user_id]
    );

    res.json({ success: true, bookings: rows });
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách booking:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách booking.",
      error: error.message,
    });
  }
});

/* =========================================================
   🔍 API: Lấy chi tiết booking (kèm lịch trình chi tiết tour)
========================================================= */
router.get("/:booking_id", async (req, res) => {
  try {
    const { booking_id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
         b.booking_id,
         b.tour_id,
         b.user_id,
         b.quantity,
         b.total_price,
         b.status,
         b.created_at,
         t.name AS tour_name,
         t.description AS tour_description,
         tp.company_name AS provider_name,
         t.start_date,
         t.end_date,
         t.currency,
         i.image_url
       FROM bookings b
       JOIN tours t ON b.tour_id = t.tour_id
       LEFT JOIN tour_providers tp ON t.provider_id = tp.provider_id
       LEFT JOIN images i ON i.entity_id = t.tour_id AND i.entity_type = 'tour'
       WHERE b.booking_id = ?
       LIMIT 1`,
      [booking_id]
    );

    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking." });

    const booking = rows[0];

    const [itineraries] = await pool.query(
      `SELECT day_number, title, description
       FROM tour_itineraries
       WHERE tour_id = ?
       ORDER BY day_number ASC`,
      [booking.tour_id]
    );

    res.json({
      success: true,
      booking: {
        ...booking,
        itineraries: itineraries || [],
      },
    });
  } catch (error) {
    console.error("❌ Lỗi lấy chi tiết booking:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy booking chi tiết.",
      error: error.message,
    });
  }
});

/* =========================================================
   💳 API: Cập nhật trạng thái booking (sau thanh toán)
========================================================= */
router.put("/:booking_id/status", async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status } = req.body;

    if (!status)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu trạng thái cập nhật." });

    await pool.query(
      "UPDATE bookings SET status = ?, updated_at = NOW() WHERE booking_id = ?",
      [status, booking_id]
    );

    res.json({
      success: true,
      message: "✅ Cập nhật trạng thái booking thành công.",
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật booking:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật booking.",
      error: error.message,
    });
  }
});

module.exports = router;

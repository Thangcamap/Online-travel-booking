const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");

/* =========================================================
   🧾 API: Tạo mới booking (khi user bấm "Đặt Tour Ngay")
========================================================= */
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /api/bookings - Request body:", req.body);
    const { user_id, tour_id, total_price, status, start_date, quantity } = req.body;
    
    // Bỏ qua quantity nếu có trong request (từ code cũ)
    if (quantity !== undefined) {
      console.log("⚠️ Warning: Request contains 'quantity' field, ignoring it");
    }

    if (!user_id || !tour_id)
      return res.status(400).json({ error: "Thiếu user_id hoặc tour_id trong request." });

    // Kiểm tra user_id có tồn tại không
    const [userCheck] = await pool.query(
      `SELECT user_id FROM users WHERE user_id = ?`,
      [user_id]
    );

    if (userCheck.length === 0) {
      console.error("❌ User not found:", user_id);
      return res.status(404).json({ 
        error: "User không tồn tại trong hệ thống. Vui lòng đăng nhập lại." 
      });
    }

    // Kiểm tra tour_id có tồn tại không
    const [tourCheck] = await pool.query(
      `SELECT tour_id FROM tours WHERE tour_id = ?`,
      [tour_id]
    );

    if (tourCheck.length === 0) {
      console.error("❌ Tour not found:", tour_id);
      return res.status(404).json({ error: "Tour không tồn tại." });
    }

    // Lấy thông tin tour và user để snapshot
    const [tourRows] = await pool.query(
      `SELECT t.name, t.price, t.currency, t.start_date, t.end_date,
              tp.company_name, u.name AS customer_name, u.email AS customer_email, u.phone_number AS customer_phone
       FROM tours t
       LEFT JOIN tour_providers tp ON t.provider_id = tp.provider_id
       LEFT JOIN users u ON u.user_id = ?
       WHERE t.tour_id = ?`,
      [user_id, tour_id]
    );

    if (tourRows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thông tin tour hoặc user." });
    }

    const tour = tourRows[0];
    const booking_start_date = start_date || tour.start_date;
    const booking_end_date = start_date ? (() => {
      const start = new Date(start_date);
      const end = new Date(tour.end_date);
      const duration = (end - start) / (1000 * 60 * 60 * 24);
      const newEnd = new Date(start_date);
      newEnd.setDate(newEnd.getDate() + duration);
      return newEnd.toISOString().split("T")[0];
    })() : tour.end_date;

    // Kiểm tra các cột có trong bảng bookings
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'bookings'`
    );
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    const hasTotalPrice = columnNames.includes('total_price');
    const hasSnapshotColumns = columnNames.includes('tour_name');
    
    console.log("📊 Available columns:", columnNames);
    console.log("📊 Has total_price:", hasTotalPrice);
    console.log("📊 Has snapshot columns:", hasSnapshotColumns);

    // Tạo booking_id nếu chưa có trigger tự động
    const booking_id = `B${Date.now().toString().slice(-8)}`;
    console.log("🆔 Generated booking_id:", booking_id);

    if (hasSnapshotColumns && hasTotalPrice) {
      // Schema đầy đủ - có snapshot và total_price
      console.log("✅ Inserting with snapshot columns + total_price");
      await pool.query(
        `INSERT INTO bookings (
          booking_id, user_id, tour_id, total_price, status, 
          tour_name, provider_name, start_date, end_date, price, currency,
          customer_name, customer_email, customer_phone,
          created_at
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          booking_id, user_id, tour_id, total_price, status || "pending",
          tour.name, tour.company_name, booking_start_date, booking_end_date,
          tour.price, tour.currency || "VND",
          tour.customer_name, tour.customer_email, tour.customer_phone
        ]
      );
    } else if (hasTotalPrice) {
      // Schema có total_price nhưng không có snapshot
      console.log("✅ Inserting with total_price only");
      await pool.query(
        `INSERT INTO bookings (booking_id, user_id, tour_id, total_price, status, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [booking_id, user_id, tour_id, total_price, status || "pending"]
      );
    } else {
      // Schema cũ nhất - chỉ có user_id, tour_id, status
      console.log("✅ Inserting basic columns only (no total_price)");
      await pool.query(
        `INSERT INTO bookings (booking_id, user_id, tour_id, status, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [booking_id, user_id, tour_id, status || "pending"]
      );
    }
    
    console.log("✅ Booking created successfully:", booking_id);

    // booking_id đã được tạo ở trên, không cần query lại

    // Tạo payment record (luôn tạo, dùng amount từ total_price hoặc tour.price)
    let payment_id = null;
    const paymentAmount = total_price || tour.price || 0;
    
    if (paymentAmount > 0) {
      payment_id = `PAY${Date.now().toString().slice(-8)}`;
      
      // Kiểm tra xem bảng payments có cột amount không
      const [paymentColumns] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'payments'`
      );
      
      const paymentColumnNames = paymentColumns.map(col => col.COLUMN_NAME);
      const hasAmount = paymentColumnNames.includes('amount');
      
      if (hasAmount) {
        await pool.query(
          `INSERT INTO payments (payment_id, booking_id, amount, method, status, created_at)
           VALUES (?, ?, ?, 'online', 'unpaid', NOW())`,
          [payment_id, booking_id, paymentAmount]
        );
        console.log("✅ Payment record created:", payment_id, "amount:", paymentAmount, "for booking:", booking_id);
      } else {
        // Schema cũ không có amount - chỉ insert booking_id
        await pool.query(
          `INSERT INTO payments (payment_id, booking_id, method, status, created_at)
           VALUES (?, ?, 'online', 'unpaid', NOW())`,
          [payment_id, booking_id]
        );
        console.log("✅ Payment record created (basic schema):", payment_id, "for booking:", booking_id);
      }
    } else {
      console.log("⚠️ Skipping payment creation (no amount value)");
    }

    res.json({
      success: true,
      booking_id,
      message: "🎉 Đặt tour thành công và đã tạo hóa đơn thanh toán!",
    });
  } catch (error) {
    console.error("❌ Lỗi tạo booking:", error);
    console.error("❌ Error details:", {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });

    // Xử lý lỗi foreign key constraint
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      if (error.sqlMessage.includes('fk_booking_user')) {
        return res.status(400).json({ 
          error: "User không tồn tại trong hệ thống. Vui lòng đăng nhập lại.",
          details: `User ID: ${req.body.user_id} không hợp lệ.`
        });
      } else if (error.sqlMessage.includes('fk_booking_tour')) {
        return res.status(400).json({ 
          error: "Tour không tồn tại trong hệ thống.",
          details: `Tour ID: ${req.body.tour_id} không hợp lệ.`
        });
      }
    }

    res.status(500).json({ 
      error: "Lỗi khi đặt tour",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* =========================================================
   📋 API: Lấy danh sách booking của user
========================================================= */
router.get("/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log("📝 GET /api/bookings/user/:user_id - User ID:", user_id);

    // Kiểm tra các cột có trong bảng bookings
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'bookings'`
    );
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    const hasTourName = columnNames.includes('tour_name');
    const hasTotalPrice = columnNames.includes('total_price');
    const hasStartDate = columnNames.includes('start_date');
    const hasEndDate = columnNames.includes('end_date');
    const hasPrice = columnNames.includes('price');
    const hasCurrency = columnNames.includes('currency');

    console.log("📊 Available columns:", columnNames);
    console.log("📊 Has tour_name:", hasTourName);
    console.log("📊 Has total_price:", hasTotalPrice);

    // Tạo query động dựa trên cột có sẵn
    let selectFields = [
      'b.booking_id',
      'b.tour_id',
      'b.user_id',
      'b.status',
      'b.created_at'
    ];

    if (hasTotalPrice) {
      selectFields.push('b.total_price');
    } else {
      selectFields.push('NULL AS total_price');
    }

    if (hasTourName) {
      selectFields.push('b.tour_name');
    } else {
      selectFields.push('t.name AS tour_name');
    }

    if (hasStartDate) {
      selectFields.push('b.start_date');
    } else {
      selectFields.push('t.start_date');
    }

    if (hasEndDate) {
      selectFields.push('b.end_date');
    } else {
      selectFields.push('t.end_date');
    }

    if (hasPrice) {
      selectFields.push('b.price');
    } else {
      selectFields.push('t.price');
    }

    if (hasCurrency) {
      selectFields.push('b.currency');
    } else {
      selectFields.push('COALESCE(t.currency, "VND") AS currency');
    }

    // Thêm image và description
    selectFields.push(`(SELECT image_url FROM images 
      WHERE entity_type='tour' AND entity_id=b.tour_id 
      LIMIT 1) AS image_url`);
    selectFields.push(`COALESCE(
      (SELECT description FROM tours WHERE tour_id = b.tour_id LIMIT 1),
      ''
    ) AS tour_description`);

    // Tạo query với LEFT JOIN tours nếu không có snapshot columns
    let query;
    if (hasTourName) {
      // Có snapshot columns, không cần JOIN
      query = `SELECT ${selectFields.join(', ')}
               FROM bookings b
               WHERE b.user_id = ?
               ORDER BY b.created_at DESC`;
    } else {
      // Không có snapshot columns, cần JOIN với tours
      query = `SELECT ${selectFields.join(', ')}
               FROM bookings b
               LEFT JOIN tours t ON b.tour_id = t.tour_id
               WHERE b.user_id = ?
               ORDER BY b.created_at DESC`;
    }

    console.log("📝 Executing query:", query.substring(0, 200) + "...");
    const [rows] = await pool.query(query, [user_id]);

    console.log("✅ Found bookings:", rows.length);
    res.json({ success: true, bookings: rows || [] });
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách booking:", error);
    console.error("❌ Error details:", {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải danh sách booking.",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
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

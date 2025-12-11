const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");

// ===========================================
// 📊 LẤY ĐIỂM CỦA USER
// ===========================================
router.get("/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    
    // Kiểm tra xem bảng user_points có tồn tại không
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'user_points'`
    );
    
    if (tables.length === 0) {
      return res.json({
        success: true,
        points: {
          total_points: 0,
          available_points: 0,
          lifetime_points: 0,
        },
        message: "Hệ thống tích điểm chưa được khởi tạo. Vui lòng chạy SQL script create_points_system.sql"
      });
    }
    
    const [rows] = await pool.query(
      `SELECT 
        total_points,
        available_points,
        lifetime_points,
        updated_at
      FROM user_points
      WHERE user_id = ?`,
      [user_id]
    );
    
    if (rows.length === 0) {
      // Khởi tạo điểm = 0 cho user mới
      await pool.query(
        `INSERT INTO user_points (user_id, total_points, available_points, lifetime_points)
         VALUES (?, 0, 0, 0)`,
        [user_id]
      );
      
      return res.json({
        success: true,
        points: {
          total_points: 0,
          available_points: 0,
          lifetime_points: 0,
        }
      });
    }
    
    res.json({
      success: true,
      points: rows[0]
    });
  } catch (err) {
    console.error("❌ [GET /points/user/:user_id] Lỗi:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi khi lấy điểm",
      details: err.sqlMessage || err.message
    });
  }
});

// ===========================================
// 📋 LẤY LỊCH SỬ GIAO DỊCH ĐIỂM
// ===========================================
router.get("/user/:user_id/transactions", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const [rows] = await pool.query(
      `SELECT 
        transaction_id,
        points,
        transaction_type,
        source_type,
        source_id,
        description,
        created_at
      FROM point_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [user_id, parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      success: true,
      transactions: rows
    });
  } catch (err) {
    console.error("❌ [GET /points/user/:user_id/transactions] Lỗi:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi khi lấy lịch sử giao dịch",
      details: err.sqlMessage || err.message
    });
  }
});

// ===========================================
// ➕ THÊM ĐIỂM THỦ CÔNG (cho admin)
// ===========================================
router.post("/user/:user_id/add", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { points, description } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: "Số điểm phải lớn hơn 0"
      });
    }
    
    const transaction_id = `PT${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Thêm transaction
    await pool.query(
      `INSERT INTO point_transactions (
        transaction_id,
        user_id,
        points,
        transaction_type,
        source_type,
        description
      ) VALUES (?, ?, ?, 'earned', 'manual', ?)`,
      [transaction_id, user_id, points, description || `Thêm ${points} điểm thủ công`]
    );
    
    // Cập nhật user_points
    await pool.query(
      `INSERT INTO user_points (user_id, total_points, available_points, lifetime_points)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_points = total_points + ?,
         available_points = available_points + ?,
         lifetime_points = lifetime_points + ?`,
      [user_id, points, points, points, points, points, points]
    );
    
    res.json({
      success: true,
      message: `Đã thêm ${points} điểm cho user ${user_id}`,
      transaction_id
    });
  } catch (err) {
    console.error("❌ [POST /points/user/:user_id/add] Lỗi:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi khi thêm điểm",
      details: err.sqlMessage || err.message
    });
  }
});

// ===========================================
// ➖ DÙNG ĐIỂM (khi đặt tour hoặc đổi quà)
// ===========================================
router.post("/user/:user_id/use", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { points, description, source_id } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: "Số điểm phải lớn hơn 0"
      });
    }
    
    // Kiểm tra điểm có đủ không
    const [userPoints] = await pool.query(
      `SELECT available_points FROM user_points WHERE user_id = ?`,
      [user_id]
    );
    
    if (userPoints.length === 0 || userPoints[0].available_points < points) {
      return res.status(400).json({
        success: false,
        error: `Không đủ điểm. Bạn có ${userPoints[0]?.available_points || 0} điểm.`
      });
    }
    
    const transaction_id = `PT${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Thêm transaction (số âm)
    await pool.query(
      `INSERT INTO point_transactions (
        transaction_id,
        user_id,
        points,
        transaction_type,
        source_type,
        source_id,
        description
      ) VALUES (?, ?, ?, 'used', 'redemption', ?, ?)`,
      [transaction_id, user_id, -points, source_id || null, description || `Sử dụng ${points} điểm`]
    );
    
    // Cập nhật user_points
    await pool.query(
      `UPDATE user_points 
       SET available_points = available_points - ?,
           total_points = total_points - ?
       WHERE user_id = ?`,
      [points, points, user_id]
    );
    
    res.json({
      success: true,
      message: `Đã sử dụng ${points} điểm`,
      transaction_id,
      remaining_points: userPoints[0].available_points - points
    });
  } catch (err) {
    console.error("❌ [POST /points/user/:user_id/use] Lỗi:", err);
    res.status(500).json({
      success: false,
      error: "Lỗi khi sử dụng điểm",
      details: err.sqlMessage || err.message
    });
  }
});

module.exports = router;


const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");
const { v4: uuidv4 } = require("uuid");

/* =========================================================
   ⭐ API: Tạo review mới
========================================================= */
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /api/reviews - Request body:", req.body);
    const { user_id, tour_id, rating, comment } = req.body;

    if (!user_id || !tour_id || rating === undefined || rating === null) {
      console.log("❌ Missing required fields:", { user_id, tour_id, rating });
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu user_id, tour_id hoặc rating." 
      });
    }

    // Validate rating (1-5)
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      console.log("❌ Invalid rating:", rating);
      return res.status(400).json({ 
        success: false, 
        message: "Rating phải từ 1 đến 5." 
      });
    }

    // Kiểm tra xem user đã đánh giá tour này chưa
    const [existing] = await pool.query(
      `SELECT review_id FROM reviews WHERE user_id = ? AND tour_id = ?`,
      [user_id, tour_id]
    );

    if (existing.length > 0) {
      console.log("🔄 Updating existing review:", existing[0].review_id);
      // Cập nhật review đã có
      await pool.query(
        `UPDATE reviews SET rating = ?, comment = ?, updated_at = NOW() 
         WHERE user_id = ? AND tour_id = ?`,
        [ratingNum, comment || null, user_id, tour_id]
      );

      console.log("✅ Review updated successfully");
      return res.json({
        success: true,
        message: "✅ Cập nhật đánh giá thành công!",
      });
    }

    // Tạo review mới
    const review_id = `rev_${Date.now()}_${uuidv4().substring(0, 8)}`;
    console.log("✨ Creating new review:", review_id);
    
    await pool.query(
      `INSERT INTO reviews (review_id, user_id, tour_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [review_id, user_id, tour_id, ratingNum, comment || null]
    );

    console.log("✅ Review created successfully");
    res.json({
      success: true,
      review_id,
      message: "✅ Đánh giá thành công!",
    });
  } catch (error) {
    console.error("❌ Lỗi tạo review:", error);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo đánh giá.",
      error: error.message 
    });
  }
});

/* =========================================================
   📋 API: Lấy danh sách reviews của tour
========================================================= */
router.get("/tour/:tour_id", async (req, res) => {
  try {
    const { tour_id } = req.params;

    const [reviews] = await pool.query(
      `SELECT 
         r.review_id,
         r.user_id,
         r.tour_id,
         r.rating,
         r.comment,
         r.created_at,
         u.name AS user_name,
         u.avatar_url AS user_avatar
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.user_id
       WHERE r.tour_id = ?
       ORDER BY r.created_at DESC`,
      [tour_id]
    );

    res.json({
      success: true,
      reviews: reviews || [],
    });
  } catch (error) {
    console.error("❌ Lỗi lấy reviews:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải đánh giá.",
      error: error.message,
    });
  }
});

/* =========================================================
   📋 API: Lấy tất cả reviews của user
========================================================= */
router.get("/user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const [reviews] = await pool.query(
      `SELECT 
         r.review_id,
         r.user_id,
         r.tour_id,
         r.rating,
         r.comment,
         r.created_at,
         r.updated_at,
         t.name AS tour_name,
         t.description AS tour_description,
         (SELECT image_url FROM images 
          WHERE entity_type='tour' AND entity_id=r.tour_id 
          LIMIT 1) AS tour_image
       FROM reviews r
       LEFT JOIN tours t ON r.tour_id = t.tour_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [user_id, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      reviews: reviews || [],
      total: reviews.length,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy reviews của user:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải đánh giá.",
      error: error.message,
    });
  }
});

/* =========================================================
   📋 API: Lấy review của user cho tour cụ thể
========================================================= */
router.get("/user/:user_id/tour/:tour_id", async (req, res) => {
  try {
    const { user_id, tour_id } = req.params;

    const [reviews] = await pool.query(
      `SELECT * FROM reviews WHERE user_id = ? AND tour_id = ?`,
      [user_id, tour_id]
    );

    res.json({
      success: true,
      review: reviews.length > 0 ? reviews[0] : null,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy review:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải đánh giá.",
      error: error.message,
    });
  }
});

/* =========================================================
   🗑️ API: Xóa review
========================================================= */
router.delete("/:review_id", async (req, res) => {
  try {
    const { review_id } = req.params;
    const { user_id } = req.body;

    // Kiểm tra quyền (chỉ user tạo review mới xóa được)
    const [review] = await pool.query(
      `SELECT user_id FROM reviews WHERE review_id = ?`,
      [review_id]
    );

    if (review.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá.",
      });
    }

    if (review[0].user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa đánh giá này.",
      });
    }

    await pool.query(`DELETE FROM reviews WHERE review_id = ?`, [review_id]);

    res.json({
      success: true,
      message: "✅ Xóa đánh giá thành công!",
    });
  } catch (error) {
    console.error("❌ Lỗi xóa review:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa đánh giá.",
      error: error.message,
    });
  }
});

module.exports = router;


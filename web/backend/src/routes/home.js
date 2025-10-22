// src/routes/home.js
const express = require("express");
const { pool } = require("../../config/mysql");
const router = express.Router();

// 📋 Lấy danh sách tour hiển thị ở trang home
router.get("/tours", async (req, res) => {
  try {
    const [tours] = await pool.query(
      `SELECT 
        t.tour_id,
        t.name,
        t.description,
        t.price,
        t.currency,
        t.start_date,
        t.end_date,
        t.available_slots,
        t.available,
        tp.company_name,
        (SELECT image_url FROM images 
          WHERE entity_type='tour' AND entity_id=t.tour_id 
          LIMIT 1) AS image_url
      FROM tours t
      LEFT JOIN tour_providers tp ON t.provider_id = tp.provider_id
      ORDER BY t.created_at DESC`
    );

    res.json(tours);
  } catch (error) {
    console.error("Error fetching home tours:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách tour." });
  }
});

module.exports = router;

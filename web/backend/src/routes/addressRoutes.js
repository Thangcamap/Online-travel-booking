const express = require("express");
const { pool } = require("../../config/mysql");
const router = express.Router();

//  Thêm địa chỉ mới
router.post("/", async (req, res) => {
  const {
    address_line1,
    address_line2,
    city,
    country,
    latitude,
    longitude,
  } = req.body;

  if (!address_line1 || !city || !country) {
    return res.status(400).json({ error: "Thiếu thông tin địa chỉ!" });
  }

  try {
    const address_id = "addr_" + Date.now();

    await pool.query(
      `INSERT INTO addresses (address_id, address_line1, address_line2, city, country, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [address_id, address_line1, address_line2, city, country, latitude, longitude]
    );

    res.json({ success: true, message: " Đã thêm địa chỉ!", address_id });
  } catch (err) {
    console.error(" Lỗi thêm địa chỉ:", err.message);
    res.status(500).json({ error: "Lỗi khi lưu địa chỉ!" });
  }
});

module.exports = router;

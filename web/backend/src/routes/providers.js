const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tạo thư mục lưu ảnh nếu chưa có
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ⚙️ Cấu hình Multer để upload file ảnh
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// 🧾 API tạo nhà cung cấp mới
router.post("/", async (req, res) => {
  try {
    const { user_id, company_name, description, email, phone_number, address_id } = req.body;

    const provider_id = "prov_" + Date.now();

    await pool.query(
      `INSERT INTO tour_providers 
      (provider_id, user_id, company_name, description, email, phone_number, address_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [provider_id, user_id, company_name, description, email, phone_number, address_id || null]
    );

    res.json({
      success: true,
      message: "✅ Provider created successfully!",
      provider_id,
    });
  } catch (error) {
    console.error("❌ Error creating provider:", error);
    res.status(500).json({ success: false, error: "Server error when creating provider." });
  }
});

// 🖼️ Upload ảnh (logo/avatar/cover)
router.post("/:providerId/upload", upload.fields([{ name: "avatar" }, { name: "cover" }]), async (req, res) => {
  try {
    const { providerId } = req.params;
    const files = req.files;

    let avatarUrl = null;
    let coverUrl = null;

    if (files.avatar) {
      avatarUrl = `/uploads/${files.avatar[0].filename}`;
      await pool.query(`UPDATE tour_providers SET logo_url = ? WHERE provider_id = ?`, [avatarUrl, providerId]);
    }

    if (files.cover) {
      coverUrl = `/uploads/${files.cover[0].filename}`;
      // nếu bạn có cột cover_url thì cập nhật, còn không thì bỏ qua
    }

    res.json({
      success: true,
      message: "Ảnh đã upload thành công!",
      avatarUrl,
      coverUrl,
    });
  } catch (error) {
    console.error("❌ Upload image error:", error);
    res.status(500).json({ success: false, error: "Server error when uploading images." });
  }
});

// 📋 Lấy danh sách provider
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tour_providers");
    res.json({ success: true, providers: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error fetching providers." });
  }
});

module.exports = router;

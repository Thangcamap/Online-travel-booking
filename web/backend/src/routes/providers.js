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

       // ✅ Kiểm tra user đã có provider chưa
    const [existing] = await pool.query(
      "SELECT provider_id FROM tour_providers WHERE user_id = ?",
      [user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "❌ Người dùng này đã có provider rồi. Không thể tạo thêm.",
      });
    }

    const provider_id = "prov_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

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
router.post(
  "/:providerId/upload",
  upload.fields([{ name: "avatar" }, { name: "cover" }]),
  async (req, res) => {
    try {
      const { providerId } = req.params;
      const files = req.files;

      let avatarUrl = null;
      let coverUrl = null;

      // ✅ Nếu có ảnh avatar
      if (files.avatar) {
        avatarUrl = `/uploads/${files.avatar[0].filename}`;

        // Cập nhật logo_url trong bảng provider
        await pool.query(
          `UPDATE tour_providers SET logo_url = ? WHERE provider_id = ?`,
          [avatarUrl, providerId]
        );

        // Thêm bản ghi vào bảng images
        await pool.query(
          `INSERT INTO images (image_id, entity_type, entity_id, image_url, description)
           VALUES (?, 'provider', ?, ?, ?)`,
          [
            "img_" + Date.now(),
            providerId,
            avatarUrl,
            "Ảnh logo provider",
          ]
        );
      }

      // ✅ Nếu có ảnh cover
      if (files.cover) {
        coverUrl = `/uploads/${files.cover[0].filename}`;

        // (nếu có cột cover_url thì cập nhật)
        await pool.query(
  `UPDATE tour_providers SET logo_url = ? WHERE provider_id = ?`,
  [coverUrl, providerId]
);


        // Ghi thêm vào bảng images
        await pool.query(
          `INSERT INTO images (image_id, entity_type, entity_id, image_url, description)
           VALUES (?, 'provider', ?, ?, ?)`,
          [
            "img_" + (Date.now() + 1),
            providerId,
            coverUrl,
            "Ảnh cover provider",
          ]
        );
      }

      res.json({
        success: true,
        message: "✅ Ảnh đã upload và lưu vào DB thành công!",
        avatarUrl,
        coverUrl,
      });
    } catch (error) {
      console.error("❌ Upload image error:", error);
      res
        .status(500)
        .json({ success: false, error: "Server error when uploading images." });
    }
  }
);

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

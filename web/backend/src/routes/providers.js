const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // ✅ Thêm uuid

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

    const provider_id = `prov_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // await pool.query(
    //   `INSERT INTO tour_providers 
    //   (provider_id, user_id, company_name, description, email, phone_number, address_id)
    //   VALUES (?, ?, ?, ?, ?, ?, ?)`,
    //   [provider_id, user_id, company_name, description, email, phone_number, address_id || null]
    // );
    await pool.query(
  `INSERT INTO tour_providers 
  (provider_id, user_id, company_name, description, email, phone_number, address_id, approval_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
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
            `img_${uuidv4()}`, // ✅ Tạo id ảnh bằng UUID
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
          `UPDATE tour_providers SET cover_url = ? WHERE provider_id = ?`,
          [coverUrl, providerId]
        );

        // Ghi thêm vào bảng images
        await pool.query(
          `INSERT INTO images (image_id, entity_type, entity_id, image_url, description)
           VALUES (?, 'provider', ?, ?, ?)`,
          [
            `img_${uuidv4()}`, // ✅ Tạo id ảnh bằng UUID
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
// 📌 Lấy provider theo user_id
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query(
      "SELECT provider_id, approval_status, status, company_name FROM tour_providers WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ exists: false }); // user chưa là provider
    }

    const provider = rows[0];
    res.json({
      exists: true,
      provider,
    });
  } catch (error) {
    console.error("❌ Error fetching provider by user:", error);
    res.status(500).json({ error: "Server error fetching provider status" });
  }
});

// 🟢 Lấy provider theo provider_id (có địa chỉ)
router.get("/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;

    const [rows] = await pool.query(
      `SELECT 
          p.provider_id,
          p.company_name,
          p.description,
          p.email,
          p.phone_number,
          p.logo_url,
          p.cover_url,
          p.approval_status,
          p.created_at,
          a.address_line1 AS address,
          a.city,
          a.country
       FROM tour_providers p
       LEFT JOIN addresses a ON p.address_id = a.address_id
       WHERE p.provider_id = ?`,
      [providerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhà cung cấp này.",
      });
    }

    res.json({
      success: true,
      provider: rows[0],
    });
  } catch (error) {
    console.error("❌ Error fetching provider:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching provider details.",
    });
  }
});



module.exports = router;

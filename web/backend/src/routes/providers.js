const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // ✅ Thêm uuid

// Tạo thư mục lưu ảnh nếu chưa có
const uploadDir = path.join(__dirname, "../../uploads/providers");
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

    // Kiểm tra trùng tên công ty
    const [checkName] = await pool.query(
      "SELECT 1 FROM tour_providers WHERE company_name = ?",
      [company_name]
    );
    if (checkName.length > 0)
      return res.status(400).json({ field: "companyName", message: "Tên công ty đã được sử dụng ." });

    // Kiểm tra trùng email
    const [checkEmail] = await pool.query(
      "SELECT 1 FROM tour_providers WHERE email = ?",
      [email]
    );
    if (checkEmail.length > 0)
      return res.status(400).json({ field: "email", message: "Email này đã được sử dụng." });

    // Kiểm tra trùng số điện thoại
    const [checkPhone] = await pool.query(
      "SELECT 1 FROM tour_providers WHERE phone_number = ?",
      [phone_number]
    );
    if (checkPhone.length > 0)
      return res.status(400).json({ field: "phoneNumber", message: "Số điện thoại đã được sử dụng." });


    // const provider_id = `prov_${Date.now()}`;
    const provider_id = "prov_" + uuidv4();
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

router.post("/:providerId/upload", upload.fields([{ name: "avatar" }, { name: "cover" }]), async (req, res) => {
  try {
    const { providerId } = req.params;
    const files = req.files;

    let avatarUrl = null;
    let coverUrl = null;

    if (files.avatar) {
      const file = files.avatar[0];
      avatarUrl = `${req.protocol}://${req.get("host")}/uploads/providers/${file.filename}`;

      // Cập nhật bảng provider
      await pool.query(`UPDATE tour_providers SET logo_url = ? WHERE provider_id = ?`, [avatarUrl, providerId]);

      // Ghi vào bảng images
      await pool.query(
        `INSERT INTO images (image_id, entity_type, entity_id, image_url, description)
         VALUES (?, 'provider', ?, ?, 'Ảnh logo provider')`,
        [`img_${uuidv4()}`, providerId, avatarUrl]
      );
    }

    if (files.cover) {
      const file = files.cover[0];
      coverUrl = `${req.protocol}://${req.get("host")}/uploads/providers/${file.filename}`;

      await pool.query(`UPDATE tour_providers SET cover_url = ? WHERE provider_id = ?`, [coverUrl, providerId]);

      await pool.query(
        `INSERT INTO images (image_id, entity_type, entity_id, image_url, description)
         VALUES (?, 'provider', ?, ?, 'Ảnh cover provider')`,
        [`img_${uuidv4()}`, providerId, coverUrl]
      );
    }

    res.json({
      success: true,
      message: "✅ Ảnh provider đã được upload & lưu DB thành công!",
      avatarUrl,
      coverUrl,
    });
  } catch (error) {
    console.error("❌ Upload image error:", error);
    res.status(500).json({ success: false, message: "Server error uploading provider image." });
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

// 🟢 Lấy provider theo provider_id (có ảnh từ bảng images)
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
          a.address_line1 AS address_line,
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

    const provider = rows[0];

    // 🖼️ Lấy thêm ảnh từ bảng images
    const [images] = await pool.query(
      `SELECT image_url, description FROM images WHERE entity_type='provider' AND entity_id = ?`,
      [providerId]
    );

    provider.images = images;

    res.json({
      success: true,
      provider,
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

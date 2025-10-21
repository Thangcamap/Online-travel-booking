const express = require("express");
const router = express.Router();
process.env.NODE_ENV = "development";
const { pool } = require("../../config/mysql");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// --- Setup thư mục upload ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../uploads/tours");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `tour_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// --- Middleware kiểm tra provider phê duyệt ---
const checkProviderApproved = async (req, res, next) => {
  let providerId =
    req.body?.provider_id || req.query?.provider_id || req.params?.provider_id;

  if (!providerId) {
    providerId = "prov_test001"; // fallback test
    console.log("⚠️ provider_id fallback:", providerId);
  }

  // Nếu là dev thì bỏ qua kiểm tra để test
  if (process.env.NODE_ENV === "development") {
    req.provider_id = providerId;
    return next();
  }

  try {
    const [rows] = await pool.query(
      "SELECT approval_status FROM tour_providers WHERE provider_id = ?",
      [providerId]
    );

    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy provider." });

    if (rows[0].approval_status !== "approved")
      return res.status(403).json({
        success: false,
        message: "Provider chưa được phê duyệt, không thể CRUD tour.",
      });

    req.provider_id = providerId;
    next();
  } catch (error) {
    console.error("Error checking provider approval:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// --- 🟢 Upload ảnh (đặt TRƯỚC route có param) ---
router.post("/:tour_id/upload-image", upload.single("image"), async (req, res) => {
  console.log("🚀 Bắt đầu xử lý upload ảnh tour...");
  console.log("📥 File nhận từ client:", req.file);
  console.log("📦 Body nhận từ client:", req.body);

if (!req.file) {
  console.log("⚠️ Không nhận được file nào từ phía client!");
} else {
  console.log("✅ Tên file gốc:", req.file.originalname);
  console.log("✅ Lưu tạm ở:", req.file.path);
  console.log("✅ Loại file:", req.file.mimetype);
}

  try {
    const { tour_id } = req.params;
    console.log("🟢 Upload ảnh cho tour:", tour_id);

    if (!tour_id)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu tour_id trong URL." });

    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Chưa chọn ảnh để tải lên!" });

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/tours/${req.file.filename}`;
    const imageId = "img_" + Date.now();

    const [result] = await pool.query(
      "INSERT INTO images (image_id, entity_type, entity_id, image_url) VALUES (?, 'tour', ?, ?)",
      [imageId, String(tour_id), imageUrl]
    );

    console.log("✅ Upload OK:", result);
    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error("❌ Upload image error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi tải ảnh lên." });
  }
});

// --- 🟢 Tạo tour ---
router.post("/", checkProviderApproved, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      start_date,
      end_date,
      available_slots,
      available,
    } = req.body;

    const provider_id = req.provider_id;
    const tour_id = "tour_" + Date.now();

    console.log("🟢 Dữ liệu nhận từ client:", req.body);
    console.log("🟢 provider_id:", provider_id);

    if (!name || !price || !start_date || !end_date || !available_slots)
      return res.status(400).json({
        success: false,
        message:
          "Thiếu dữ liệu! name, price, available_slots, start_date, end_date là bắt buộc.",
      });

    const [insertResult] = await pool.query(
      `INSERT INTO tours (tour_id, provider_id, name, description, price, currency, start_date, end_date, available_slots, available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tour_id,
        provider_id,
        name,
        description || "",
        price,
        currency || "VND",
        start_date,
        end_date,
        available_slots,
        available ?? true,
      ]
    );

    console.log("✅ Insert result:", insertResult);

    const [rows] = await pool.query("SELECT * FROM tours WHERE tour_id = ?", [tour_id]);
    console.log("📦 Kết quả SELECT:", rows);

    if (!rows || rows.length === 0) {
      console.log("⚠️ Không tìm thấy tour vừa tạo!");
      return res.json({ success: true, message: "Tour created but not fetched." });
    }

    const newTour = rows[0];
    console.log("✅ Tour vừa tạo:", newTour);

    res.json({ success: true, tour: newTour });
  } catch (err) {
    console.error("❌ Create tour error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi tạo tour." });
  }
});


// --- 📋 Lấy danh sách tour theo provider ---
router.get("/provider/:provider_id", checkProviderApproved, async (req, res) => {

  try {
    const { provider_id } = req.params;

    const [tours] = await pool.query(
      "SELECT * FROM tours WHERE provider_id = ? ORDER BY created_at DESC",
      [provider_id]
    );

    for (const tour of tours) {
      const [imgs] = await pool.query(
        "SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=?",
        [tour.tour_id]
      );
      tour.images = imgs;
    }

    res.json({ success: true, tours });
  } catch (err) {
    console.error("Fetch tours error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi lấy danh sách tour." });
  }
});

// --- ✏️ Cập nhật tour ---
router.put("/:tour_id", checkProviderApproved, async (req, res) => {
  try {
    const { tour_id } = req.params;
    const {
      name,
      description,
      price,
      currency,
      start_date,
      end_date,
      available_slots,
      available,
    } = req.body;

    await pool.query(
      `UPDATE tours
       SET name=?, description=?, price=?, currency=?, start_date=?, end_date=?, available_slots=?, available=?
       WHERE tour_id=?`,
      [
        name,
        description || "",
        price,
        currency || "VND",
        start_date,
        end_date,
        available_slots,
        available ?? true,
        tour_id,
      ]
    );

    res.json({ success: true, message: "✅ Tour updated successfully!" });
  } catch (err) {
    console.error("Update tour error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi cập nhật tour." });
  }
});

// --- 🗑️ Xóa tour ---
router.delete("/:tour_id", checkProviderApproved, async (req, res) => {
  try {
    const { tour_id } = req.params;

    await pool.query("DELETE FROM images WHERE entity_type='tour' AND entity_id=?", [
      tour_id,
    ]);
    await pool.query("DELETE FROM tours WHERE tour_id=?", [tour_id]);

    res.json({ success: true, message: "🗑️ Tour deleted successfully!" });
  } catch (err) {
    console.error("Delete tour error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi xóa tour." });
  }
});
// 📥 Tạo mới lịch trình (khi tour mới tạo)
router.post("/:tour_id/itinerary", async (req, res) => {
  const { tour_id } = req.params;
  const { itinerary } = req.body;

  try {
    for (const item of itinerary) {
      await pool.query(
        "INSERT INTO tour_itineraries (tour_id, day_number, title, description) VALUES (?, ?, ?, ?)",
        [tour_id, item.day_number, item.title || "", item.description || ""]
      );
    }
    res.json({ success: true, message: "Lưu lịch trình thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi lưu lịch trình:", err);
    res.status(500).json({ success: false, message: "Lỗi khi lưu lịch trình" });
  }
});

// 📘 Cập nhật lịch trình (PUT)
router.put("/:tour_id/itinerary", async (req, res) => {
  const { tour_id } = req.params;
  const { itinerary } = req.body;

  try {
    // Xóa lịch trình cũ trước
    await pool.query("DELETE FROM tour_itineraries WHERE tour_id = ?", [tour_id]);

    // Thêm lại toàn bộ lịch trình mới
    for (const item of itinerary) {
      await pool.query(
        "INSERT INTO tour_itineraries (tour_id, day_number, title, description) VALUES (?, ?, ?, ?)",
        [tour_id, item.day_number, item.title || "", item.description || ""]
      );
    }

    res.json({ success: true, message: "Cập nhật lịch trình thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật lịch trình:", err);
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật lịch trình" });
  }
});



module.exports = router;

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
    console.log(" provider_id fallback:", providerId);
  }

  // Nếu là dev thì bỏ qua kiểm tra để test
  if (process.env.NODE_ENV === "development") {
    req.provider_id = providerId;
    return next();
  }

  try {
    const [rows] = await pool.query(
      `SELECT tp.approval_status, tp.status AS provider_status, u.status AS user_status
       FROM tour_providers tp
       JOIN users u ON tp.user_id = u.user_id
       WHERE tp.provider_id = ?`,
      [providerId]
    );

    if (rows.length === 0)
      return res.status(404).json({ success: false, message: "Không tìm thấy provider." });

    const { approval_status, provider_status, user_status } = rows[0];

    //  User bị khóa
    if (user_status !== "active")
      return res.status(403).json({
        success: false,
        message: "Tài khoản người dùng đã bị khóa hoặc tạm ngưng.",
      });

    //  Provider bị khóa
    if (provider_status !== "active")
      return res.status(403).json({
        success: false,
        message: "Tài khoản nhà cung cấp đang bị khóa hoặc tạm ngưng.",
      });

    //  Provider chưa được duyệt
    if (approval_status !== "approved")
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


// ---  Upload ảnh (đặt TRƯỚC route có param) ---
router.post("/:tour_id/upload-image", upload.single("image"), async (req, res) => {
  console.log("🚀 Bắt đầu xử lý upload ảnh tour...");
  console.log("📥 File nhận từ client:", req.file);
  console.log("📦 Body nhận từ client:", req.body);

if (!req.file) {
  console.log(" Không nhận được file nào từ phía client!");
} else {
  console.log(" Tên file gốc:", req.file.originalname);
  console.log(" Lưu tạm ở:", req.file.path);
  console.log(" Loại file:", req.file.mimetype);
}

  try {
    const { tour_id } = req.params;
    console.log(" Upload ảnh cho tour:", tour_id);

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

    console.log(" Upload OK:", result);
    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error("❌ Upload image error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi tải ảnh lên." });
  }
});

// ---  Tạo tour ---
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

    console.log(" Dữ liệu nhận từ client:", req.body);
    console.log(" provider_id:", provider_id);

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

    console.log(" Insert result:", insertResult);

    const [rows] = await pool.query("SELECT * FROM tours WHERE tour_id = ?", [tour_id]);
    console.log(" Kết quả SELECT:", rows);

    if (!rows || rows.length === 0) {
      console.log(" Không tìm thấy tour vừa tạo!");
      return res.json({ success: true, message: "Tour created but not fetched." });
    }

    const newTour = rows[0];
    console.log(" Tour vừa tạo:", newTour);

    res.json({ success: true, tour: newTour });
  } catch (err) {
    console.error("❌ Create tour error:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi tạo tour." });
  }
});


// ---  Lấy danh sách tour theo provider ---
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
            // 🗓 Lấy lịch trình
      const [itinerary] = await pool.query(
        "SELECT day_number AS day, description AS plan FROM tour_itineraries WHERE tour_id=? ORDER BY day_number ASC",
        [tour.tour_id]
      );
      tour.itinerary = itinerary; //  Gắn thêm vào đối tượng tour
    }
    

    res.json({ success: true, tours });
  } catch (err) {
    console.error("Fetch tours error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi lấy danh sách tour." });
  }
});

// ---  Cập nhật tour ---
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

    res.json({ success: true, message: " Tour updated successfully!" });
  } catch (err) {
    console.error("Update tour error:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi cập nhật tour." });
  }
});

// ---  Xóa ảnh của tour ---
router.delete("/:tour_id/images", async (req, res) => {
  const { tour_id } = req.params;

  try {
    // Xóa ảnh khỏi database
    const [result] = await pool.query(
      "DELETE FROM images WHERE entity_type = 'tour' AND entity_id = ?",
      [tour_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh để xóa cho tour này.",
      });
    }

    res.json({
      success: true,
      message: "Ảnh của tour đã được xóa thành công.",
    });
  } catch (err) {
    console.error("❌ Lỗi khi xóa ảnh tour:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa ảnh tour.",
    });
  }
});


// ---  Xóa tour ---
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
//  Tạo mới lịch trình (khi tour mới tạo)
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
    console.error(" Lỗi khi lưu lịch trình:", err);
    res.status(500).json({ success: false, message: "Lỗi khi lưu lịch trình" });
  }
});

// ---  Lấy lịch trình theo tour_id ---
router.get("/:tour_id/itinerary", async (req, res) => {
  const { tour_id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT day_number, title, description FROM tour_itineraries WHERE tour_id = ? ORDER BY day_number ASC",
      [tour_id]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        itinerary: [],
        message: "Tour chưa có lịch trình.",
      });
    }

    res.json({ success: true, itinerary: rows });
  } catch (err) {
    console.error(" Lỗi khi lấy lịch trình:", err);
    res.status(500).json({ success: false, message: "Lỗi khi lấy lịch trình." });
  }
});


//  Cập nhật lịch trình (PUT)
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
    console.error(" Lỗi khi cập nhật lịch trình:", err);
    res.status(500).json({ success: false, message: "Lỗi khi cập nhật lịch trình" });
  }
});
// ---  Lấy thông tin provider theo user_id ---
router.get("/provider/by-user/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM tour_providers WHERE user_id = ? LIMIT 1",
      [user_id]
    );

    if (rows.length === 0) {
      return res.json({ success: true, exists: false });
    }

    res.json({ success: true, exists: true, provider: rows[0] });
  } catch (error) {
    console.error(" Error fetching provider by user:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy provider." });
  }
});

// ---  Lấy danh sách tour công khai ---
router.get("/", async (req, res) => {
  try {
    const [tours] = await pool.query(`
      SELECT 
        t.tour_id,
        t.name,
        t.description,
        t.price,
        t.currency,
        t.start_date,
        t.end_date,
        i.image_url
      FROM tours t
      LEFT JOIN images i 
        ON i.entity_id = t.tour_id
       AND i.entity_type = 'tour'
      WHERE t.available = 1
      ORDER BY t.created_at DESC
    `);

    res.json(tours);
  } catch (err) {
    console.error(" Lỗi lấy danh sách tour công khai:", err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});


// ---  Lấy chi tiết tour công khai theo tour_id ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    //  Lấy thông tin tour
    const [rows] = await pool.query(`
      SELECT 
        t.tour_id,
        t.provider_id,
        t.name,
        t.description,
        t.price,
        t.currency,
        t.start_date,
        t.end_date,
        t.schedule_info,
        t.experience_info,
        t.package_info,
        t.guide_info,
        t.note_info,
        t.surcharge_info
      FROM tours t
      WHERE t.tour_id = ?
      LIMIT 1
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy tour" });

    const tour = rows[0];

    //  Lấy toàn bộ ảnh của tour
    const [images] = await pool.query(
      `SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=?`,
      [id]
    );
    tour.images = images.map(i => i.image_url);

    //  Lịch trình
    const [itinerary] = await pool.query(
      `SELECT day_number, title, description 
       FROM tour_itineraries 
       WHERE tour_id = ? 
       ORDER BY day_number ASC`,
      [id]
    );
    tour.itineraries = itinerary;

    res.json(tour);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// GET /api/providers/:providerId/bookings
router.get("/providers/:providerId/bookings", async (req, res) => {
  const { providerId } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
        b.booking_id,
        b.quantity,
        b.total_price,
        b.status AS booking_status,
        b.booking_date,
        b.check_in_time,

        u.name AS user_name,
        u.email,
        u.phone_number,

        t.name AS tour_name,
        t.tour_id,

        p.payment_id,
        p.method,
        p.amount,
        p.status AS payment_status,
        p.payment_image

      FROM bookings b
      INNER JOIN users u ON b.user_id = u.user_id
      INNER JOIN tours t ON b.tour_id = t.tour_id
      INNER JOIN payments p ON p.booking_id = b.booking_id
      WHERE t.provider_id = ?
      AND p.status = 'paid'
      ORDER BY b.created_at DESC`,
      [providerId]
    );

    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error(" Error fetching provider bookings:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// PUT /api/bookings/:booking_id/status
router.put("/bookings/:booking_id/status", async (req, res) => {
  const { booking_id } = req.params;
  const { status } = req.body;

  if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE bookings SET status = ?, updated_at = NOW() WHERE booking_id = ?`,
      [status, booking_id]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking status updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", err });
  }
});



module.exports = router;

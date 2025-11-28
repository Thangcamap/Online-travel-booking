const { pool } = require("../../config/mysql");

// ======================== UPLOAD IMAGE ==========================
exports.uploadImage = async (req, res) => {
  try {
    const { tour_id } = req.params;

    if (!tour_id)
      return res.status(400).json({ success: false, message: "Missing tour_id" });

    if (!req.file)
      return res.status(400).json({ success: false, message: "No image provided" });

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/tours/${req.file.filename}`;
    const imageId = "img_" + Date.now();

    await pool.query(
      "INSERT INTO images (image_id, entity_type, entity_id, image_url) VALUES (?, 'tour', ?, ?)",
      [imageId, String(tour_id), imageUrl]
    );

    res.json({ success: true, imageUrl });

  } catch (err) {
    console.error("Upload image error:", err);
    res.status(500).json({ success: false, message: "Server upload error" });
  }
};

// ======================== CREATE TOUR ==========================
exports.createTour = async (req, res) => {
  try {
    const {
      name, description, price, currency,
      start_date, end_date, available_slots, available
    } = req.body;

    const provider_id = req.provider_id;
    const tour_id = "tour_" + Date.now();

    if (!name || !price || !start_date || !end_date || !available_slots) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu quan trọng."
      });
    }

    await pool.query(
      `INSERT INTO tours (tour_id, provider_id, name, description, price, currency,
        start_date, end_date, available_slots, available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tour_id, provider_id, name, description || "",
        price, currency || "VND", start_date, end_date,
        available_slots, available ?? true
      ]
    );

    const [rows] = await pool.query("SELECT * FROM tours WHERE tour_id = ?", [tour_id]);

    res.json({ success: true, tour: rows[0] });

  } catch (err) {
    console.error("Create tour error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== GET TOURS OF PROVIDER ==========================
exports.getToursByProvider = async (req, res) => {
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

      const [itinerary] = await pool.query(
        "SELECT day_number AS day, description AS plan FROM tour_itineraries WHERE tour_id=? ORDER BY day_number ASC",
        [tour.tour_id]
      );

      tour.itinerary = itinerary;
    }

    res.json({ success: true, tours });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== UPDATE TOUR ==========================
exports.updateTour = async (req, res) => {
  try {
    const { tour_id } = req.params;
    const {
      name, description, price, currency,
      start_date, end_date, available_slots, available
    } = req.body;

    await pool.query(
      `UPDATE tours SET name=?, description=?, price=?, currency=?, 
       start_date=?, end_date=?, available_slots=?, available=? WHERE tour_id=?`,
      [
        name, description || "", price, currency || "VND",
        start_date, end_date, available_slots, available ?? true, tour_id
      ]
    );

    res.json({ success: true, message: "Tour updated" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== DELETE TOUR ==========================
exports.deleteTour = async (req, res) => {
  try {
    const { tour_id } = req.params;

    await pool.query("DELETE FROM images WHERE entity_type='tour' AND entity_id=?", [tour_id]);
    await pool.query("DELETE FROM tours WHERE tour_id=?", [tour_id]);

    res.json({ success: true, message: "Tour deleted" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== ITINERARY (CREATE / GET / UPDATE) ==========================
exports.createItinerary = async (req, res) => {
  try {
    const { tour_id } = req.params;
    const { itinerary } = req.body;

    for (const item of itinerary) {
      await pool.query(
        "INSERT INTO tour_itineraries (tour_id, day_number, title, description) VALUES (?, ?, ?, ?)",
        [tour_id, item.day_number, item.title || "", item.description || ""]
      );
    }

    res.json({ success: true, message: "Lưu lịch trình thành công!" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getItinerary = async (req, res) => {
  try {
    const { tour_id } = req.params;

    const [rows] = await pool.query(
      "SELECT day_number, title, description FROM tour_itineraries WHERE tour_id = ? ORDER BY day_number ASC",
      [tour_id]
    );

    res.json({ success: true, itinerary: rows });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateItinerary = async (req, res) => {
  try {
    const { tour_id } = req.params;
    const { itinerary } = req.body;

    await pool.query("DELETE FROM tour_itineraries WHERE tour_id = ?", [tour_id]);

    for (const item of itinerary) {
      await pool.query(
        "INSERT INTO tour_itineraries (tour_id, day_number, title, description) VALUES (?, ?, ?, ?)",
        [tour_id, item.day_number, item.title || "", item.description || ""]
      );
    }

    res.json({ success: true, message: "Cập nhật lịch trình thành công!" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ======================== PUBLIC LIST / DETAIL ==========================
exports.getPublicTours = async (req, res) => {
  try {
    const [tours] = await pool.query(`
      SELECT 
        t.tour_id, t.name, t.description, t.price, t.currency,
        t.start_date, t.end_date, i.image_url
      FROM tours t
      LEFT JOIN images i ON i.entity_id = t.tour_id AND i.entity_type = 'tour'
      WHERE t.available = 1
      ORDER BY t.created_at DESC
    `);

    res.json(tours);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPublicTourDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT * FROM tours WHERE tour_id = ? LIMIT 1`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Tour not found" });

    const tour = rows[0];

    const [images] = await pool.query(
      `SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=?`,
      [id]
    );
    tour.images = images.map(i => i.image_url);

    const [itinerary] = await pool.query(
      `SELECT day_number, title, description FROM tour_itineraries WHERE tour_id = ? ORDER BY day_number ASC`,
      [id]
    );
    tour.itineraries = itinerary;

    res.json(tour);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ======================== BOOKINGS ==========================
exports.getProviderBookings = async (req, res) => {
  try {
    const { providerId } = req.params;

    const [rows] = await pool.query(
      `SELECT 
        b.booking_id, b.quantity, b.total_price, b.status AS booking_status,
        b.booking_date, b.check_in_time,
        u.name AS user_name, u.email, u.phone_number,
        t.name AS tour_name, t.tour_id,
        p.payment_id, p.method, p.amount, p.status AS payment_status, p.payment_image
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
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const [result] = await pool.query(
      `UPDATE bookings SET status=?, updated_at=NOW() WHERE booking_id=?`,
      [status, booking_id]
    );

    if (result.affectedRows === 0)
      return res.json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking updated" });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const { pool } = require("../../config/mysql");

// ======================== UPLOAD IMAGE ==========================
exports.insertImage = async (tour_id, imageUrl) => {
  const imageId = "img_" + Date.now();
  await pool.query(
    "INSERT INTO images (image_id, entity_type, entity_id, image_url) VALUES (?, 'tour', ?, ?)",
    [imageId, String(tour_id), imageUrl]
  );
  return { imageId, imageUrl };
};

// ======================== CREATE TOUR ==========================
exports.createTourRecord = async (provider_id, tourData) => {
  const tour_id = "tour_" + Date.now();
  const {
    name, description, price, currency,
    start_date, end_date, available_slots, available
  } = tourData;

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
  return rows[0];
};

// ======================== GET TOURS OF PROVIDER ==========================
exports.getToursByProviderId = async (provider_id) => {
  const [tours] = await pool.query(
    "SELECT * FROM tours WHERE provider_id = ? ORDER BY created_at DESC",
    [provider_id]
  );

  for (const tour of tours) {
    const [imgs] = await pool.query(
      "SELECT image_id, image_url FROM images WHERE entity_type='tour' AND entity_id=?",
      [tour.tour_id]
    );
    tour.images = imgs;

    const [itinerary] = await pool.query(
      "SELECT day_number AS day, description AS plan FROM tour_itineraries WHERE tour_id=? ORDER BY day_number ASC",
      [tour.tour_id]
    );
    tour.itinerary = itinerary;
  }

  return tours;
};

// ======================== UPDATE TOUR ==========================
exports.updateTourRecord = async (tour_id, tourData) => {
  const {
    name, description, price, currency,
    start_date, end_date, available_slots, available
  } = tourData;

  const [result] = await pool.query(
    `UPDATE tours SET name=?, description=?, price=?, currency=?, 
     start_date=?, end_date=?, available_slots=?, available=? WHERE tour_id=?`,
    [
      name, description || "", price, currency || "VND",
      start_date, end_date, available_slots, available ?? true, tour_id
    ]
  );

  return result;
};

// ======================== DELETE TOUR ==========================
exports.deleteTourRecord = async (tour_id) => {
  await pool.query("DELETE FROM images WHERE entity_type='tour' AND entity_id=?", [tour_id]);
  await pool.query("DELETE FROM tours WHERE tour_id=?", [tour_id]);
};

// ======================== ITINERARY (CREATE / GET / UPDATE) ==========================
exports.createItineraryRecord = async (tour_id, itinerary) => {
  for (const item of itinerary) {
    await pool.query(
      "INSERT INTO tour_itineraries (tour_id, day_number, title, description) VALUES (?, ?, ?, ?)",
      [tour_id, item.day_number, item.title || "", item.description || ""]
    );
  }
};

exports.getItineraryRecord = async (tour_id) => {
  const [rows] = await pool.query(
    "SELECT day_number, title, description FROM tour_itineraries WHERE tour_id = ? ORDER BY day_number ASC",
    [tour_id]
  );
  return rows;
};

exports.updateItineraryRecord = async (tour_id, itinerary) => {
  await pool.query("DELETE FROM tour_itineraries WHERE tour_id = ?", [tour_id]);

  for (const item of itinerary) {
    await pool.query(
      "INSERT INTO tour_itineraries (tour_id, day_number, title, description) VALUES (?, ?, ?, ?)",
      [tour_id, item.day_number, item.title || "", item.description || ""]
    );
  }
};

// ======================== PUBLIC LIST / DETAIL ==========================
exports.getPublicToursRecord = async () => {
  const [tours] = await pool.query(`
    SELECT 
      t.tour_id, 
      t.name, 
      t.description, 
      t.price, 
      t.currency,
      t.start_date, 
      t.end_date,
      t.available_slots,
      (SELECT image_url FROM images 
       WHERE entity_type='tour' AND entity_id=t.tour_id 
       LIMIT 1) AS image_url
    FROM tours t
    LEFT JOIN tour_providers tp ON t.provider_id = tp.provider_id
    LEFT JOIN users u ON tp.user_id = u.user_id
    WHERE 
      t.available = 1
      AND (tp.provider_id IS NULL OR (tp.status = 'active' AND tp.approval_status = 'approved'))
      AND (tp.provider_id IS NULL OR u.user_id IS NULL OR u.status = 'active')
      AND (t.available_slots IS NULL OR t.available_slots > 0)
    GROUP BY t.tour_id
    ORDER BY t.created_at DESC
  `);
  return tours;
};

exports.getPublicTourDetailRecord = async (tour_id) => {
  const [rows] = await pool.query(
    `SELECT * FROM tours WHERE tour_id = ? LIMIT 1`,
    [tour_id]
  );

  if (!rows.length) return null;

  const tour = rows[0];

  const [images] = await pool.query(
    `SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=?`,
    [tour_id]
  );
  tour.images = images.map(i => i.image_url);

  const [itinerary] = await pool.query(
    `SELECT day_number, title, description FROM tour_itineraries WHERE tour_id = ? ORDER BY day_number ASC`,
    [tour_id]
  );
  tour.itineraries = itinerary;

  return tour;
};

// ======================== BOOKINGS ==========================
exports.getProviderBookingsRecord = async (provider_id) => {
  const [rows] = await pool.query(
    `SELECT 
      b.booking_id, b.total_price, b.status AS booking_status,
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
    [provider_id]
  );
  return rows;
};

exports.updateBookingStatusRecord = async (booking_id, status) => {
  const [result] = await pool.query(
    `UPDATE bookings SET status=?, updated_at=NOW() WHERE booking_id=?`,
    [status, booking_id]
  );
  return result;
};

// ======================== IMAGE ==========================
exports.getImageRecord = async (image_id, tour_id) => {
  const [rows] = await pool.query(
    "SELECT image_url FROM images WHERE image_id=? AND entity_id=? AND entity_type='tour'",
    [image_id, tour_id]
  );
  return rows[0] || null;
};

exports.deleteImageRecord = async (image_id) => {
  await pool.query(
    "DELETE FROM images WHERE image_id=? AND entity_type='tour'",
    [image_id]
  );
};

exports.getTourImagesRecord = async (tour_id) => {
  const [rows] = await pool.query(
    "SELECT image_id, image_url FROM images WHERE entity_type='tour' AND entity_id=?",
    [tour_id]
  );
  return rows;
};

// ======================== GET BOOKINGS BY TOUR ==========================
exports.getTourBookingsRecord = async (tour_id) => {
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
    WHERE b.tour_id = ?
    AND p.status = 'paid'
    ORDER BY b.created_at DESC`,
    [tour_id]
  );
  return rows;
};
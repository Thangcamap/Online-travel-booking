const { pool } = require("../../config/mysql");

// ======================== PROVIDER ==========================
exports.getPendingProviders = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM tour_providers WHERE approval_status = 'pending'"
  );
  return rows;
};

exports.getAllProviders = async () => {
  const [rows] = await pool.query(`
    SELECT 
      tp.provider_id,
      tp.company_name,
      tp.email,
      tp.phone_number,
      tp.logo_url,
      tp.cover_url,
      tp.status,
      tp.approval_status,
      u.name AS owner_name,
      COUNT(DISTINCT t.tour_id) AS total_tours,
      COALESCE(SUM(p.amount), 0) AS total_revenue
    FROM tour_providers tp
    JOIN users u ON tp.user_id = u.user_id
    LEFT JOIN tours t ON tp.provider_id = t.provider_id
    LEFT JOIN bookings b ON t.tour_id = b.tour_id
    LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'paid'
    GROUP BY tp.provider_id
    ORDER BY tp.created_at DESC
  `);
  return rows;
};

exports.updateProviderApprovalStatus = async (provider_id, status) => {
  const [result] = await pool.query(
    `UPDATE tour_providers 
     SET approval_status = ?, 
         status = CASE WHEN ? = 'rejected' THEN 'inactive' ELSE status END
     WHERE provider_id = ?`,
    [status, status, provider_id]
  );
  return result;
};

// ======================== USER ==========================
exports.getAllUsers = async () => {
  const [rows] = await pool.query(
    "SELECT user_id, name, email, phone_number, role, status, created_at FROM users"
  );
  return rows;
};

exports.updateUserStatus = async (user_id, status) => {
  const [result] = await pool.query(
    "UPDATE users SET status = ? WHERE user_id = ?",
    [status, user_id]
  );
  return result;
};

exports.updateProviderStatusByUserId = async (user_id, providerStatus) => {
  const [result] = await pool.query(
    "UPDATE tour_providers SET status = ? WHERE user_id = ?",
    [providerStatus, user_id]
  );
  return result;
};

exports.updateProviderStatusByUserIdWithApproval = async (user_id, providerStatus) => {
  const [result] = await pool.query(
    `UPDATE tour_providers 
     SET status = ? 
     WHERE user_id = ? AND approval_status = 'approved'`,
    [providerStatus, user_id]
  );
  return result;
};

exports.updateTourAvailabilityByUserId = async (user_id, available) => {
  await pool.query(
    `UPDATE tours 
     SET available = ? 
     WHERE provider_id IN (SELECT provider_id FROM tour_providers WHERE user_id = ?)`,
    [available, user_id]
  );
};

exports.updateTourAvailabilityByUserIdWithApproval = async (user_id, available) => {
  await pool.query(
    `UPDATE tours 
     SET available = ? 
     WHERE provider_id IN (
        SELECT provider_id FROM tour_providers 
        WHERE user_id = ? AND approval_status = 'approved'
     )`,
    [available, user_id]
  );
};

exports.getProvidersByUserId = async (user_id) => {
  const [providers] = await pool.query(
    "SELECT provider_id FROM tour_providers WHERE user_id = ?",
    [user_id]
  );
  return providers;
};

// ======================== TOUR ==========================
exports.getAllToursWithRevenue = async () => {
  const [tours] = await pool.query(`
    SELECT 
      t.tour_id,
      t.name,
      t.price,
      t.provider_id,
      COUNT(b.booking_id) AS total_bookings,
      COALESCE(SUM(p.amount), 0) AS total_revenue
    FROM tours t
    JOIN tour_providers tp ON t.provider_id = tp.provider_id
    LEFT JOIN bookings b ON t.tour_id = b.tour_id
    LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'paid'
    WHERE tp.status = 'active' AND tp.approval_status = 'approved'
    GROUP BY t.tour_id
  `);
  return tours;
};

// ======================== PAYMENT ==========================
exports.getAllPayments = async () => {
  const [rows] = await pool.query(`
    SELECT 
      p.payment_id,
      p.booking_id,
      p.amount,
      p.method,
      p.status,
      p.payment_image,
      p.created_at,
      p.updated_at,
      u.name AS user_name,
      u.email AS user_email,
      u.phone_number AS user_phone,
      t.name AS tour_name,
      tp.company_name AS provider_name
    FROM payments p
    JOIN bookings b ON p.booking_id = b.booking_id
    JOIN users u ON b.user_id = u.user_id
    JOIN tours t ON b.tour_id = t.tour_id
    JOIN tour_providers tp ON t.provider_id = tp.provider_id
    ORDER BY p.created_at DESC
  `);
  return rows;
};

exports.updatePaymentStatus = async (payment_id, status) => {
  const [result] = await pool.query(
    `UPDATE payments SET status = ?, updated_at = NOW() WHERE payment_id = ?`,
    [status, payment_id]
  );
  return result;
};

exports.getPaymentDetail = async (payment_id) => {
  const [rows] = await pool.query(
    `SELECT 
      p.payment_id,
      p.amount,
      p.method,
      p.status,
      p.payment_image,
      p.created_at,
      u.name AS user_name,
      u.email AS user_email,
      u.phone_number,
      t.name AS tour_name,
      t.start_date,
      t.end_date,
      tp.company_name AS provider_name
    FROM payments p
    JOIN bookings b ON p.booking_id = b.booking_id
    JOIN users u ON b.user_id = u.user_id
    JOIN tours t ON b.tour_id = t.tour_id
    JOIN tour_providers tp ON t.provider_id = tp.provider_id
    WHERE p.payment_id = ?`,
    [payment_id]
  );
  return rows.length > 0 ? rows[0] : null;
};
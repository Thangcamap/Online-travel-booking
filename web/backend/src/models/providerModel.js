const { pool } = require("../../config/mysql");

module.exports = {
  checkExistingProvider: (user_id) =>
    pool.query("SELECT provider_id FROM tour_providers WHERE user_id = ?", [user_id]),

  checkCompanyName: (company_name) =>
    pool.query("SELECT 1 FROM tour_providers WHERE company_name = ?", [company_name]),

  checkEmail: (email) =>
    pool.query("SELECT 1 FROM tour_providers WHERE email = ?", [email]),

  checkPhone: (phone_number) =>
    pool.query("SELECT 1 FROM tour_providers WHERE phone_number = ?", [phone_number]),

  createProvider: (provider_id, user_id, company_name, description, email, phone_number, address_id) =>
    pool.query(
      `INSERT INTO tour_providers 
      (provider_id, user_id, company_name, description, email, phone_number, address_id, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [provider_id, user_id, company_name, description, email, phone_number, address_id || null]
    ),

  getProviders: () =>
    pool.query("SELECT * FROM tour_providers"),

  getProviderByUser: (userId) =>
    pool.query(
      "SELECT provider_id, approval_status, status, company_name FROM tour_providers WHERE user_id = ?",
      [userId]
    ),

  getProviderDetail: (providerId) =>
    pool.query(
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
    ),

  insertImage: (image_id, providerId, url, description) =>
    pool.query(
      `INSERT INTO images (image_id, entity_type, entity_id, image_url, description)
       VALUES (?, 'provider', ?, ?, ?)`,
      [image_id, providerId, url, description]
    ),

  updateLogo: (url, providerId) =>
    pool.query(`UPDATE tour_providers SET logo_url = ? WHERE provider_id = ?`, [url, providerId]),

  updateCover: (url, providerId) =>
    pool.query(`UPDATE tour_providers SET cover_url = ? WHERE provider_id = ?`, [url, providerId]),

  getImages: (providerId) =>
    pool.query(`SELECT image_url, description FROM images WHERE entity_type='provider' AND entity_id = ?`, [providerId])
};

const { pool } = require("../../config/mysql");

module.exports = async function checkProviderApproved(req, res, next) {
  let providerId =
    req.body?.provider_id || req.query?.provider_id || req.params?.provider_id;

  if (!providerId) {
    providerId = "prov_test001";
    console.log(" provider_id fallback:", providerId);
  }

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

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Không tìm thấy provider." });

    const { approval_status, provider_status, user_status } = rows[0];

    if (user_status !== "active")
      return res.status(403).json({ success: false, message: "User bị khóa." });

    if (provider_status !== "active")
      return res.status(403).json({ success: false, message: "Provider bị khóa." });

    if (approval_status !== "approved")
      return res.status(403).json({ success: false, message: "Provider chưa duyệt." });

    req.provider_id = providerId;
    next();

  } catch (err) {
    console.error("Error checkProviderApproved:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

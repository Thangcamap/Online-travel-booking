const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");

// ✅ Lấy danh sách provider chờ duyệt
router.get("/providers/pending", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tour_providers WHERE approval_status = 'pending'"
    );
    res.json({ success: true, providers: rows });
  } catch (error) {
    console.error("❌ Error fetching pending providers:", error);
    res.status(500).json({ success: false, error: "Server error." });
  }
});

// ✅ Admin duyệt hoặc từ chối provider
router.put("/providers/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' hoặc 'rejected'

    await pool.query(
      "UPDATE tour_providers SET approval_status = ? WHERE provider_id = ?",
      [status, id]
    );

    res.json({ success: true, message: `Provider ${status} successfully.` });
  } catch (error) {
    console.error("❌ Error updating provider approval:", error);
    res.status(500).json({ success: false, error: "Server error updating approval." });
  }
});

module.exports = router;

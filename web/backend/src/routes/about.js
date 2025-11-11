const express = require("express");
const router = express.Router();
const { pool } = require("../../config/mysql");

// 📘 API About: lấy thông tin giới thiệu + tour nổi bật từ DB
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
      ORDER BY t.created_at DESC
    `);

    // ✅ Đổi toàn bộ sang AI-TRAVEL
    const aboutData = {
      title: "Về AI-TRAVEL",
      subtitle: "Trí tuệ du lịch – Trải nghiệm thông minh",
      description:
        "AI-TRAVEL là nền tảng đặt tour du lịch thông minh ứng dụng trí tuệ nhân tạo, giúp bạn khám phá, lựa chọn và thanh toán hành trình chỉ trong vài phút.",
      highlights: [
        {
          title: "Đặt tour thông minh",
          desc: "AI gợi ý hành trình và ưu đãi phù hợp với bạn.",
        },
        {
          title: "Tour đa dạng",
          desc: "Khám phá khắp Việt Nam và thế giới với hàng trăm lựa chọn hấp dẫn.",
        },
        {
          title: "Hỗ trợ 24/7",
          desc: "Đội ngũ tận tâm, sẵn sàng đồng hành cùng bạn trong mọi chuyến đi.",
        },
      ],
      tours,
    };

    res.json(aboutData);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu About:", err);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

module.exports = router;

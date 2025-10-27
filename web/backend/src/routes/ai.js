// src/routes/ai.js
const express = require("express");
const router = express.Router();
const openai = require("../../config/openai");
const { pool } = require("../../config/mysql");
const { v4: uuidv4 } = require("uuid");

router.post("/chat", async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message)
    return res.status(400).json({ success: false, message: "Thiếu user_id hoặc message" });

  try {
    // 1️⃣ Lưu tin nhắn user vào DB
    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message)
       VALUES (?, ?, 'user', ?)`,
      [uuidv4(), user_id, message]
    );

    // 2️⃣ Gọi OpenAI để trích từ khóa từ câu nói người dùng
    const keywordPrompt = `
Phân tích câu sau và liệt kê các TỪ KHÓA du lịch quan trọng (tên địa điểm, món ăn, hoạt động, phong cách du lịch...):
"${message}"
Trả về dạng JSON ví dụ:
{"keywords":["ẩm thực","biển","Phú Quốc","nghỉ dưỡng"]}
`;
    const keywordResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: keywordPrompt,
    });

    // Parse JSON keywords
    let keywords = [];
    try {
      const text = keywordResponse.output[0].content[0].text;
      const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        keywords = parsed.keywords || [];
      }
    } catch (err) {
      console.warn("⚠️ Lỗi phân tích từ khóa:", err);
    }

    // Nếu AI không tìm thấy từ khóa thì fallback = chia nhỏ câu người dùng
    if (keywords.length === 0) {
      keywords = message
        .toLowerCase()
        .split(" ")
        .filter((x) => x.length > 2);
    }

    // 3️⃣ Lấy tour từ DB (lọc theo các từ khóa)
    const [tours] = await pool.query(`
      SELECT 
        t.tour_id, t.name, t.description, t.price, t.currency,
        (SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=t.tour_id LIMIT 1) AS image_url,
        p.company_name AS provider,
        IFNULL(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT b.booking_id) AS total_bookings
      FROM tours t
      LEFT JOIN reviews r ON t.tour_id = r.tour_id
      LEFT JOIN bookings b ON t.tour_id = b.tour_id
      LEFT JOIN tour_providers p ON t.provider_id = p.provider_id
      WHERE t.available = TRUE
      GROUP BY t.tour_id
      ORDER BY avg_rating DESC, total_bookings DESC;
    `);

    // 4️⃣ Tính điểm phù hợp của mỗi tour theo số lần khớp từ khóa
    const scoredTours = tours
      .map((t) => {
        const text = `${t.name} ${t.description}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (text.includes(kw.toLowerCase())) score++;
        }
        return { ...t, score };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score || b.avg_rating - a.avg_rating);

    // Nếu không có tour nào khớp, fallback lấy top tour nổi bật
    const matchedTours = scoredTours.length > 0 ? scoredTours.slice(0, 5) : tours.slice(0, 5);

    // 5️⃣ Lấy lịch sử hội thoại gần nhất
    const [history] = await pool.query(
      `SELECT role, message FROM ai_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 15`,
      [user_id]
    );

    const historyText = history
      .map((m) => `${m.role === "user" ? "Người dùng" : "AI"}: ${m.message}`)
      .join("\n");

    // 6️⃣ Prompt cho AI tạo phản hồi tự nhiên
    const prompt = `
Bạn là trợ lý du lịch thông minh, hãy nói chuyện tự nhiên, gợi ý tour phù hợp với yêu cầu của người dùng.

Người dùng nói: "${message}"
Từ khóa chính: ${keywords.join(", ")}

Dưới đây là các tour phù hợp:
${matchedTours
  .map(
    (t, i) => `
${i + 1}. ${t.name} (${t.provider || "Không rõ"})
   - ${t.description?.slice(0, 120) || "Không có mô tả"}...
   - Giá: ${t.price?.toLocaleString() || "Liên hệ"} ${t.currency || "VND"}
   - Đánh giá: ${Number(t.avg_rating || 0).toFixed(1)}/5 (${t.total_bookings || 0} lượt đặt)
`
  )
  .join("\n")}

Hãy chọn và giới thiệu 2–3 tour nổi bật nhất cho người dùng.
`;

    // 7️⃣ Gọi AI để tạo phản hồi tự nhiên
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const aiReply = completion.output[0].content[0].text;

    // 8️⃣ Lưu phản hồi AI
    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message)
       VALUES (?, ?, 'assistant', ?)`,
      [uuidv4(), user_id, aiReply]
    );

    // 9️⃣ Trả kết quả cho client
    res.json({
      success: true,
      reply: aiReply,
      keywords,
      tours: matchedTours.slice(0, 5),
    });
  } catch (err) {
    console.error("❌ AI chat error:", err);
    res.status(500).json({ success: false, message: "Lỗi xử lý AI." });
  }
});

module.exports = router;

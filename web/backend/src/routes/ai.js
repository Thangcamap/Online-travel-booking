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

    // 2️⃣ Trích từ khóa bằng OpenAI
    const keywordPrompt = `
Phân tích câu sau và liệt kê các TỪ KHÓA du lịch quan trọng (tên địa điểm, hoạt động, món ăn, phong cách, thời gian,...):
"${message}"
Trả về JSON ví dụ:
{"keywords":["Huế","ẩm thực","nghỉ dưỡng","biển"]}
`;
    const keywordResponse = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: keywordPrompt,
    });

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

    if (keywords.length === 0) {
      keywords = message
        .toLowerCase()
        .split(" ")
        .filter((x) => x.length > 2);
    }

    // 3️⃣ Lấy danh sách tour + lịch trình từ DB
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

    // 4️⃣ Lấy thêm lịch trình cho từng tour
    const [itineraries] = await pool.query(`
      SELECT tour_id, day_number, title, description
      FROM tour_itineraries
      ORDER BY tour_id, day_number;
    `);

    const itineraryMap = {};
    itineraries.forEach((it) => {
      if (!itineraryMap[it.tour_id]) itineraryMap[it.tour_id] = [];
      itineraryMap[it.tour_id].push(it);
    });

    // 5️⃣ Tính điểm phù hợp (bao gồm mô tả + lịch trình)
    const scoredTours = tours
      .map((t) => {
        const itTexts = itineraryMap[t.tour_id]?.map(it => `${it.title} ${it.description}`.toLowerCase()).join(" ") || "";
        const text = `${t.name} ${t.description} ${itTexts}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (text.includes(kw.toLowerCase())) score++;
        }
        return { 
          ...t, 
          itineraries: itineraryMap[t.tour_id] || [],
          score 
        };
      })
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score || b.avg_rating - a.avg_rating);

    const matchedTours = scoredTours.length > 0 ? scoredTours.slice(0, 5) : tours.slice(0, 5);

    // 6️⃣ Lấy lịch sử hội thoại gần nhất
    const [history] = await pool.query(
      `SELECT role, message FROM ai_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 15`,
      [user_id]
    );

    const historyText = history
      .map((m) => `${m.role === "user" ? "Người dùng" : "AI"}: ${m.message}`)
      .join("\n");

    // 7️⃣ Prompt để tạo phản hồi tự nhiên
    const prompt = `
Bạn là trợ lý du lịch thông minh. Hãy trả lời tự nhiên và gợi ý 2–3 tour nổi bật.

Người dùng: "${message}"
Từ khóa: ${keywords.join(", ")}

Danh sách tour phù hợp:
${matchedTours
  .map(
    (t, i) => `
${i + 1}. ${t.name} (${t.provider || "Không rõ"})
   - ${t.description?.slice(0, 100) || "Không có mô tả"}...
   - Giá: ${t.price?.toLocaleString() || "Liên hệ"} ${t.currency || "VND"}
   - Đánh giá: ${parseFloat(t.avg_rating || 0).toFixed(1)}/5
   - Lịch trình mẫu:
${(t.itineraries || []).slice(0, 3).map(it => `      • Ngày ${it.day_number}: ${it.title} - ${it.description?.slice(0, 60)}...`).join("\n")}
`
  )
  .join("\n")}
`;

    // 8️⃣ Gọi OpenAI để tạo phản hồi
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const aiReply = completion.output[0].content[0].text;

    // 9️⃣ Lưu phản hồi AI
    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message)
       VALUES (?, ?, 'assistant', ?)`,
      [uuidv4(), user_id, aiReply]
    );

    res.json({
      success: true,
      reply: aiReply,
      keywords,
      tours: matchedTours,
    });
  } catch (err) {
    console.error("❌ AI chat error:", err);
    res.status(500).json({ success: false, message: "Lỗi xử lý AI." });
  }
});

module.exports = router;

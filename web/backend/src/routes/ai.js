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

    // 2️⃣ Nhận diện ngày tháng trong tin nhắn (VD: "31 tháng 10", "1/11", "2-11", ...)
    const dateMatch =
      message.match(/\b(\d{1,2})[\/\-\. ]?tháng[\/\-\. ]?(\d{1,2})\b/i) ||
      message.match(/\b(\d{1,2})[\/\-\. ](\d{1,2})\b/);
    let searchDate = null;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = new Date().getFullYear();
      searchDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      console.log("📅 Ngày được phát hiện trong tin nhắn:", searchDate);
    }

    // 3️⃣ Trích từ khóa bằng OpenAI
    const keywordPrompt = `
Phân tích câu sau và liệt kê các TỪ KHÓA du lịch quan trọng (địa điểm, hoạt động, món ăn, phong cách, thời gian,...):
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

    // 4️⃣ Lấy danh sách tour, lọc theo ngày nếu có
    let query = `
      SELECT 
        t.tour_id, t.name, t.description, t.price, t.currency,
        (SELECT image_url FROM images WHERE entity_type='tour' AND entity_id=t.tour_id LIMIT 1) AS image_url,
        p.company_name AS provider,
        IFNULL(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT b.booking_id) AS total_bookings,
        t.start_date, t.end_date
      FROM tours t
      LEFT JOIN reviews r ON t.tour_id = r.tour_id
      LEFT JOIN bookings b ON t.tour_id = b.tour_id
      LEFT JOIN tour_providers p ON t.provider_id = p.provider_id
      WHERE t.available = TRUE
    `;

    const params = [];
    if (searchDate) {
      query += ` AND t.start_date <= ? AND t.end_date >= ?`;
      params.push(searchDate, searchDate);
    }

    query += `
      GROUP BY t.tour_id
      ORDER BY avg_rating DESC, total_bookings DESC;
    `;

    const [tours] = await pool.query(query, params);

    // 5️⃣ Lấy thêm lịch trình
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

    // 6️⃣ Tính điểm phù hợp theo từ khóa
    const scoredTours = tours
      .map((t) => {
        const itTexts =
          itineraryMap[t.tour_id]?.map((it) => `${it.title} ${it.description}`.toLowerCase()).join(" ") || "";
        const text = `${t.name} ${t.description} ${itTexts}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (text.includes(kw.toLowerCase())) score++;
        }
        return { ...t, itineraries: itineraryMap[t.tour_id] || [], score };
      })
      .filter((t) => t.score > 0 || searchDate) // nếu có ngày thì vẫn giữ
      .sort((a, b) => b.score - a.score || b.avg_rating - a.avg_rating);

    const matchedTours = scoredTours.length > 0 ? scoredTours.slice(0, 5) : tours.slice(0, 5);

    // 7️⃣ Lấy lịch sử hội thoại gần nhất
    const [history] = await pool.query(
      `SELECT role, message FROM ai_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 15`,
      [user_id]
    );

    const historyText = history
      .map((m) => `${m.role === "user" ? "Người dùng" : "AI"}: ${m.message}`)
      .join("\n");

    // 8️⃣ Prompt tạo phản hồi tự nhiên
    const prompt = `
Bạn là trợ lý du lịch thông minh. Hãy trả lời tự nhiên, gợi ý 2–3 tour phù hợp.

Người dùng: "${message}"
Từ khóa: ${keywords.join(", ")}
Thời gian người dùng hỏi: ${searchDate || "Không xác định"}

Danh sách tour:
${matchedTours
  .map(
    (t, i) => `
${i + 1}. ${t.name} (${t.provider || "Không rõ"})
   - Từ ${t.start_date} đến ${t.end_date}
   - ${t.description?.slice(0, 100) || "Không có mô tả"}...
   - Giá: ${t.price?.toLocaleString() || "Liên hệ"} ${t.currency || "VND"}
   - Đánh giá: ${parseFloat(t.avg_rating || 0).toFixed(1)}/5
   - Lịch trình mẫu:
${(t.itineraries || [])
  .slice(0, 3)
  .map((it) => `      • Ngày ${it.day_number}: ${it.title} - ${it.description?.slice(0, 60)}...`)
  .join("\n")}
`
  )
  .join("\n")}
`;

    // 9️⃣ Gọi OpenAI tạo phản hồi
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const aiReply = completion.output[0].content[0].text;

    // 🔟 Lưu phản hồi AI
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
      searchDate,
    });
  } catch (err) {
    console.error("❌ AI chat error:", err);
    res.status(500).json({ success: false, message: "Lỗi xử lý AI." });
  }
});

module.exports = router;

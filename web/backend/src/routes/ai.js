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

    // 2️⃣ Nhận diện ngày tháng
    const dateMatch =
      message.match(/\b(\d{1,2})[\/\-\. ]?tháng[\/\-\. ]?(\d{1,2})\b/i) ||
      message.match(/\b(\d{1,2})[\/\-\. ](\d{1,2})\b/);
    let searchDate = null;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = new Date().getFullYear();
      searchDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      console.log("📅 Ngày được phát hiện:", searchDate);
    }

    // 3️⃣ Trích từ khóa bằng OpenAI
    const keywordPrompt = `
Phân tích câu sau và liệt kê các TỪ KHÓA du lịch quan trọng (địa điểm, hoạt động, món ăn, phong cách,...):
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

    // 4️⃣ Truy vấn danh sách tour
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
    query += ` GROUP BY t.tour_id ORDER BY avg_rating DESC, total_bookings DESC;`;

    const [tours] = await pool.query(query, params);

    // 5️⃣ Lấy lịch trình
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

    // 6️⃣ 🔍 Phân tích yêu cầu giá (đắt / rẻ / khoảng giá)
    const lowerMsg = message.toLowerCase();
    let pricePref = null; // "cheap" | "expensive" | {min, max}

    if (/\b(rẻ nhất|giá rẻ nhất|giá thấp nhất|rẻ thôi|rẻ nhất có thể)\b/.test(lowerMsg) ||
        /\b(rẻ|giá rẻ|giá thấp|budget|cheap)\b/.test(lowerMsg)) {
      pricePref = "cheap";
    }
    if (/\b(đắt nhất|giá đắt nhất|giá cao nhất|đắt|giá cao|expensive)\b/.test(lowerMsg)) {
      pricePref = "expensive";
    }

    const moneyNormalize = (s) => {
      s = s.replace(/\./g, "").replace(/,/g, "");
      if (/triệu/.test(s)) return parseFloat(s.replace(/[^\d.]/g, "")) * 1_000_000;
      if (/k\b/.test(s)) return parseFloat(s.replace(/[^\d.]/g, "")) * 1000;
      const n = parseFloat(s.replace(/[^\d.]/g, ""));
      return Number.isFinite(n) ? n : null;
    };

    let rangeMatch = null;
    const rangeRegex = /từ\s*([\d\.,\s\w]+)\s*(?:đ|vnd|vnđ|triệu|k)?\s*(?:đến|-|to)\s*([\d\.,\s\w]+)\s*(?:đ|vnd|vnđ|triệu|k)?/i;
    const lessRegex = /(?:dưới|<|ít hơn)\s*([\d\.,\s\w]+)\s*(?:đ|vnd|vnđ|triệu|k)?/i;
    const moreRegex = /(?:trên|>|nhiều hơn)\s*([\d\.,\s\w]+)\s*(?:đ|vnd|vnđ|triệu|k)?/i;

    if ((rangeMatch = lowerMsg.match(rangeRegex))) {
      const a = moneyNormalize(rangeMatch[1]);
      const b = moneyNormalize(rangeMatch[2]);
      if (a && b) pricePref = { min: Math.min(a, b), max: Math.max(a, b) };
    } else if ((rangeMatch = lowerMsg.match(lessRegex))) {
      const a = moneyNormalize(rangeMatch[1]);
      if (a) pricePref = { min: 0, max: a };
    } else if ((rangeMatch = lowerMsg.match(moreRegex))) {
      const a = moneyNormalize(rangeMatch[1]);
      if (a) pricePref = { min: a, max: Number.MAX_SAFE_INTEGER };
    }

    console.log("💰 Price preference:", pricePref);

    // 7️⃣ Áp dụng lọc + tính điểm phù hợp
    let candidateTours = tours;
    if (pricePref && typeof pricePref === "object") {
      candidateTours = candidateTours.filter((t) => {
        const price = Number(t.price || 0);
        return price >= (pricePref.min || 0) && price <= (pricePref.max || Number.MAX_SAFE_INTEGER);
      });
    }

    const scoredTours = candidateTours.map((t) => {
      const itTexts = (itineraryMap[t.tour_id] || [])
        .map((it) => `${it.title} ${it.description}`.toLowerCase())
        .join(" ");
      const text = `${t.name} ${t.description} ${itTexts}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) if (text.includes(kw)) score++;
      score += parseFloat(t.avg_rating || 0) * 0.5;
      score += parseInt(t.total_bookings || 0) * 0.1;

      if (pricePref === "cheap") {
        const priceNum = Number(t.price || 0) || 1;
        score += 1 / (Math.log(priceNum + 1) + 1);
      }
      if (pricePref === "expensive") {
        const priceNum = Number(t.price || 0) || 0;
        score += Math.log(priceNum + 1) / 10;
      }
      return { ...t, itineraries: itineraryMap[t.tour_id] || [], score };
    });

    // 8️⃣ Sắp xếp theo preference
    let finalSorted;
    if (pricePref === "cheap") {
      finalSorted = scoredTours.sort((a, b) => {
        const pa = Number(a.price || 0), pb = Number(b.price || 0);
        if (pa !== pb) return pa - pb;
        return b.score - a.score;
      });
    } else if (pricePref === "expensive") {
      finalSorted = scoredTours.sort((a, b) => {
        const pa = Number(a.price || 0), pb = Number(b.price || 0);
        if (pa !== pb) return pb - pa;
        return b.score - a.score;
      });
    } else {
      finalSorted = scoredTours.sort((a, b) => b.score - a.score);
    }

    const matchedTours = finalSorted.slice(0, 5);

    // 9️⃣ Lấy lịch sử hội thoại gần nhất
    const [history] = await pool.query(
      `SELECT role, message FROM ai_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 15`,
      [user_id]
    );

    const historyText = history
      .map((m) => `${m.role === "user" ? "Người dùng" : "AI"}: ${m.message}`)
      .join("\n");

    // 🔟 Gọi OpenAI tạo phản hồi tự nhiên
    const prompt = `
Bạn là trợ lý du lịch thông minh. Hãy trả lời thân thiện và gợi ý tour phù hợp.

Người dùng: "${message}"
Từ khóa: ${keywords.join(", ")}
Ưu tiên giá: ${typeof pricePref === "string" ? pricePref : pricePref ? JSON.stringify(pricePref) : "Không rõ"}
Ngày đi: ${searchDate || "Không xác định"}

Danh sách tour phù hợp:
${matchedTours
  .map(
    (t, i) => `
${i + 1}. ${t.name} (${t.provider || "Không rõ"})
   - Giá: ${t.price?.toLocaleString() || "Liên hệ"} ${t.currency || "VND"}
   - Thời gian: ${t.start_date} → ${t.end_date}
   - Đánh giá: ${parseFloat(t.avg_rating || 0).toFixed(1)}/5
   - Mô tả: ${t.description?.slice(0, 120) || "Không có mô tả"}...
`
  )
  .join("\n")}
`;

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
      pricePref,
      tours: matchedTours,
      searchDate,
    });
  } catch (err) {
    console.error("❌ AI chat error:", err);
    res.status(500).json({ success: false, message: "Lỗi xử lý AI." });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const openai = require("../../config/openai");
const { pool } = require("../../config/mysql");
const { v4: uuidv4 } = require("uuid");

// 🔥 NEW: Use AI to extract comprehensive keywords
async function extractKeywordsWithAI(message) {
  try {
    const prompt = `Phân tích câu hỏi du lịch sau và trích xuất TẤT CẢ các yếu tố quan trọng:

Câu hỏi: "${message}"

Hãy trích xuất:
1. Địa điểm (locations): tên thành phố, tỉnh, vùng miền
2. Hoạt động (activities): du thuyền, leo núi, tắm biển, ăn hải sản, tham quan...
3. Phong cách (style): nghỉ dưỡng, mạo hiểm, văn hóa, ẩm thực...
4. Đặc điểm (features): biển, núi, rừng, đảo, vịnh, động...

Trả về JSON:
{
  "locations": ["địa điểm 1", "địa điểm 2"],
  "activities": ["hoạt động 1", "hoạt động 2"],
  "style": ["phong cách 1"],
  "features": ["đặc điểm 1", "đặc điểm 2"],
  "keywords": ["tất cả keywords quan trọng"]
}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
    
    const text = response.output[0].content[0].text;
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
    
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      return {
        locations: parsed.locations || [],
        activities: parsed.activities || [],
        style: parsed.style || [],
        features: parsed.features || [],
        allKeywords: parsed.keywords || []
      };
    }
  } catch (err) {
    console.warn("⚠️ AI keyword extraction failed:", err);
  }
  
  return null;
}

// 🔥 NEW: Detect if message is a follow-up question
function isFollowUpQuestion(message) {
  const lowerMsg = message.toLowerCase();
  
  // If message contains "tour" followed by specific details, it's NOT a follow-up
  if (/tour[\s\-]+[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]{3,}/i.test(message)) {
    return false;
  }
  
  const followUpPatterns = [
    /^(tư vấn|cho tôi|giới thiệu|nói thêm|kể thêm|chi tiết|thông tin|xem thêm)$/,
    /^(tư vấn|cho tôi|giới thiệu) (thêm|nữa|tiếp)$/,
    /^(có|được|ok|oke|được không|được nữa)/,
    /^(còn|thế|vậy|như vậy)/,
    /tour (này|đó|kia|nào|trên)/,
    /(tour|địa điểm|nơi) (trên|đó|kia|này)/,
    /^(yes|yeah|ok|oke|đồng ý|được|có)$/i,
    /thêm về/,
    /chi tiết hơn/
  ];
  
  return followUpPatterns.some(pattern => pattern.test(lowerMsg.trim()));
}

// 🔥 NEW: Extract tour context from previous messages
async function getPreviousTourContext(user_id) {
  try {
    const [lastMessages] = await pool.query(
      `SELECT message, tours FROM ai_messages 
       WHERE user_id = ? AND role = 'assistant' AND tours IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );
    
    if (lastMessages.length > 0 && lastMessages[0].tours) {
      const tours = JSON.parse(lastMessages[0].tours);
      if (tours && tours.length > 0) {
        return {
          tours,
          lastMessage: lastMessages[0].message
        };
      }
    }
  } catch (err) {
    console.error("Error getting tour context:", err);
  }
  
  return null;
}

// 🔥 IMPROVED: Advanced scoring with semantic understanding
function calculateTourScore(tour, keywordData, itineraryTexts) {
  const tourText = `${tour.name} ${tour.description} ${itineraryTexts}`.toLowerCase();
  const tourName = tour.name.toLowerCase();
  
  let score = 0;
  let matchDetails = {
    locations: 0,
    activities: 0,
    style: 0,
    features: 0,
    keywords: 0
  };
  
  // Helper function for whole-word matching
  const matchesWholeWord = (text, keyword) => {
    if (keyword.length < 4) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    }
    return text.includes(keyword.toLowerCase());
  };
  
  // Score locations (highest weight - 10 points each)
  if (keywordData.locations) {
    keywordData.locations.forEach(loc => {
      if (matchesWholeWord(tourText, loc)) {
        score += 10;
        matchDetails.locations++;
        if (matchesWholeWord(tourName, loc)) score += 15; // Extra for name match
      }
    });
  }
  
  // Score activities (high weight - 8 points each)
  if (keywordData.activities) {
    keywordData.activities.forEach(activity => {
      if (matchesWholeWord(tourText, activity)) {
        score += 8;
        matchDetails.activities++;
        if (matchesWholeWord(tourName, activity)) score += 12;
      }
    });
  }
  
  // Score features (medium weight - 5 points each)
  if (keywordData.features) {
    keywordData.features.forEach(feature => {
      if (matchesWholeWord(tourText, feature)) {
        score += 5;
        matchDetails.features++;
        if (matchesWholeWord(tourName, feature)) score += 7;
      }
    });
  }
  
  // Score style (medium weight - 5 points each)
  if (keywordData.style) {
    keywordData.style.forEach(s => {
      if (matchesWholeWord(tourText, s)) {
        score += 5;
        matchDetails.style++;
        if (matchesWholeWord(tourName, s)) score += 7;
      }
    });
  }
  
  // Score general keywords (lower weight - 3 points each)
  if (keywordData.allKeywords) {
    keywordData.allKeywords.forEach(kw => {
      if (matchesWholeWord(tourText, kw)) {
        score += 3;
        matchDetails.keywords++;
      }
    });
  }
  
  // Calculate total possible categories matched
  const categoriesWithMatches = [
    matchDetails.locations > 0,
    matchDetails.activities > 0,
    matchDetails.features > 0,
    matchDetails.style > 0
  ].filter(Boolean).length;
  
  // Require matching in at least 1 major category (locations, activities, or features)
  if (matchDetails.locations === 0 && matchDetails.activities === 0 && matchDetails.features === 0) {
    return 0;
  }
  
  // Bonus for matching multiple categories
  if (categoriesWithMatches >= 2) {
    score *= 1.3;
  }
  if (categoriesWithMatches >= 3) {
    score *= 1.5;
  }
  
  // Add rating and popularity
  score += parseFloat(tour.avg_rating || 0) * 0.5;
  score += Math.min(parseInt(tour.total_bookings || 0) * 0.1, 3);
  
  return { score, matchDetails };
}

router.post("/chat", async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message)
    return res.status(400).json({ success: false, message: "Thiếu user_id hoặc message" });

  try {
    // 1️⃣ Save user message
    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message)
       VALUES (?, ?, 'user', ?)`,
      [uuidv4(), user_id, message]
    );

    // 🔥 Check if this is a follow-up question
    const isFollowUp = isFollowUpQuestion(message);
    let previousContext = null;
    
    if (isFollowUp) {
      previousContext = await getPreviousTourContext(user_id);
      console.log("🔗 Follow-up detected, loading context:", previousContext ? "Found" : "None");
    }

    // 2️⃣ Date detection
    const dateMatch =
      message.match(/\b(\d{1,2})[\/\-\. ]?tháng[\/\-\. ]?(\d{1,2})\b/i) ||
      message.match(/\b(\d{1,2})[\/\-\. ](\d{1,2})\b/);
    let searchDate = null;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = new Date().getFullYear();
      searchDate = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      console.log("📅 Detected date:", searchDate);
    }

    // 3️⃣ 🔥 IMPROVED: Use AI for comprehensive keyword extraction
    let keywordData = await extractKeywordsWithAI(message);
    
    if (!keywordData) {
      // Fallback to simple extraction
      keywordData = {
        locations: [],
        activities: [],
        style: [],
        features: [],
        allKeywords: message.toLowerCase().split(" ").filter(x => x.length > 2)
      };
    }
    
    console.log("🔑 Extracted keyword data:", JSON.stringify(keywordData, null, 2));

    // 🔥 Extract specific tour name if mentioned
    let specificTourName = null;
    const tourNameMatch = message.match(/tour\s+([a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s\-–—]+)/i);
    if (tourNameMatch && tourNameMatch[1].length > 5) {
      specificTourName = tourNameMatch[1].trim();
      console.log("🎯 Specific tour requested:", specificTourName);
    }

    // 4️⃣ Query tours
    let tours = [];
    let matchedTours = [];
    
    // If follow-up with context, return previous tours
    if (isFollowUp && previousContext && previousContext.tours.length > 0) {
      matchedTours = previousContext.tours;
      console.log("✅ Returning", matchedTours.length, "tours from context");
    } else {
      // Regular tour search
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
      query += ` GROUP BY t.tour_id;`;

      [tours] = await pool.query(query, params);

      // 5️⃣ Get itineraries
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

      // 6️⃣ Price preference detection
      const lowerMsg = message.toLowerCase();
      let pricePref = null;

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

      // 7️⃣ Filter by price range, then score
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
        
        const { score, matchDetails } = calculateTourScore(t, keywordData, itTexts);
        
        let finalScore = score;
        
        // 🔥 Massive boost for exact tour name match
        if (specificTourName) {
          const tourNameLower = t.name.toLowerCase();
          const specificNameLower = specificTourName.toLowerCase();
          const specificWords = specificNameLower.split(/[\s\-–—]+/).filter(w => w.length > 2);
          const matchedWords = specificWords.filter(w => tourNameLower.includes(w));
          
          if (matchedWords.length >= Math.max(2, specificWords.length * 0.5)) {
            finalScore += 100;
            console.log(`🎯 Tour name match: "${t.name}" (${matchedWords.length}/${specificWords.length} words)`);
          }
        }
        
        // Price preference adjustments
        if (pricePref === "cheap") {
          const priceNum = Number(t.price || 0);
          finalScore += priceNum > 0 ? 10 / Math.log10(priceNum + 10) : 5;
        } else if (pricePref === "expensive") {
          const priceNum = Number(t.price || 0);
          finalScore += Math.log10(priceNum + 1) / 2;
        }
        
        return { 
          ...t, 
          itineraries: itineraryMap[t.tour_id] || [], 
          score: finalScore,
          matchDetails
        };
      });

      // 8️⃣ Sort and apply intelligent filtering
      let finalSorted;
      if (pricePref === "cheap") {
        finalSorted = scoredTours
          .filter(t => t.score > 0)
          .sort((a, b) => {
            const pa = Number(a.price || 0), pb = Number(b.price || 0);
            if (pa !== pb) return pa - pb;
            return b.score - a.score;
          });
      } else if (pricePref === "expensive") {
        finalSorted = scoredTours
          .filter(t => t.score > 0)
          .sort((a, b) => {
            const pa = Number(a.price || 0), pb = Number(b.price || 0);
            if (pa !== pb) return pb - pa;
            return b.score - a.score;
          });
      } else {
        finalSorted = scoredTours
          .filter(t => t.score > 0)
          .sort((a, b) => b.score - a.score);
      }

      // 🔥 Intelligent filtering based on score distribution
      if (finalSorted.length > 0) {
        const topScore = finalSorted[0].score;
        
        // Dynamic threshold: tours must be within 50% of top score, or at least score 10
        const minScore = Math.max(8, topScore * 0.4);
        
        finalSorted = finalSorted.filter(t => t.score >= minScore);
        
        console.log(`🎯 Top score: ${topScore.toFixed(1)}, Min threshold: ${minScore.toFixed(1)}`);
        console.log(`📊 Filtered scores: ${finalSorted.slice(0, 5).map(t => `${t.score.toFixed(1)} (${JSON.stringify(t.matchDetails)})`).join(', ')}`);
      }

      // Limit to top 3 tours
      matchedTours = finalSorted.slice(0, 3);
      console.log(`✅ Found ${matchedTours.length} highly relevant tours`);
    }

    // 9️⃣ Get conversation history
    const [history] = await pool.query(
      `SELECT role, message FROM ai_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [user_id]
    );

    const historyText = history
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.message}`)
      .join("\n");

    // 🔟 Generate AI response
    const prompt = `Bạn là trợ lý du lịch chuyên nghiệp. ${isFollowUp ? "Câu hỏi TIẾP THEO về tour đã tư vấn." : "Yêu cầu MỚI."}

Lịch sử:
${historyText}

Yêu cầu: "${message}"
${specificTourName ? `Tour cụ thể: "${specificTourName}"` : ''}

${matchedTours.length > 0 ? `
Tours phù hợp:
${matchedTours.map((t, i) => `
${i + 1}. ${t.name}
   Giá: ${t.price?.toLocaleString()} ${t.currency || "VND"}
   Thời gian: ${t.start_date} → ${t.end_date}
   Đánh giá: ${parseFloat(t.avg_rating || 0).toFixed(1)}⭐
`).join("\n")}
` : "Không tìm thấy tour phù hợp."}

Hướng dẫn:
- Gợi ý tour PHÙ HỢP NHẤT, giải thích rõ LÝ DO
- Làm nổi bật điểm ĐẶC BIỆT
- Kết thúc: "Bạn muốn biết thêm về tour nào?"

Trả lời ngắn gọn, thân thiện (3-5 câu).`;

    let aiReply;
    try {
      const completion = await openai.responses.create({
        model: "gpt-4o",
        input: prompt,
        temperature: 0.7,
      });
      aiReply = completion.output[0].content[0].text;
    } catch (err) {
      console.warn("⚠️ gpt-4o failed, using gpt-4.1-mini");
      const completion = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.7,
      });
      aiReply = completion.output[0].content[0].text;
    }

    // Save AI response
    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message, tours)
       VALUES (?, ?, 'assistant', ?, ?)`,
      [uuidv4(), user_id, aiReply, JSON.stringify(matchedTours)]
    );

    res.json({
      success: true,
      reply: aiReply,
      tours: matchedTours,
      searchDate,
      isFollowUp,
      keywordData
    });
  } catch (err) {
    console.error("❌ AI chat error:", err);
    res.status(500).json({ success: false, message: "Lỗi xử lý AI." });
  }
});

router.get("/history/:user_id", async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "Thiếu user_id" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT role, message, tours FROM ai_messages
       WHERE user_id = ? 
       ORDER BY created_at ASC`,
      [user_id]
    );

    res.json({
      success: true,
      messages: rows.map(r => ({
        role: r.role,
        message: r.message,
        tours: r.tours ? JSON.parse(r.tours) : []
      }))
    });
  } catch (err) {
    console.error("❌ Lỗi tải lịch sử chat:", err);
    res.status(500).json({ success: false, message: "Lỗi tải lịch sử chat" });
  }
});

module.exports = router;
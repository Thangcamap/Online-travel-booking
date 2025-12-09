const express = require("express");
const router = express.Router();
const openai = require("../../config/openai");
const { pool } = require("../../config/mysql");
const { v4: uuidv4 } = require("uuid");

// 🧠 OPTIMIZED: AI-powered semantic preference with cache & rate limit handling
async function extractUserPreferences(message) {
  try {
    // Check cache first
    const cacheKey = `preferences:${message}`;
    const cached = apiCallCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("📦 Using cached preferences");
      return cached.data;
    }

    const prompt = `Phân tích sở thích du lịch của người dùng từ câu hỏi này:

"${message}"

Trích xuất các yếu tố SỐ THÍCH (không phải chỉ keyword mà là ý định thực sự):

Trả về JSON (KHÔNG có text khác):
{
  "travelStyle": {
    "description": "mô tả phong cách du lịch (mạo hiểm, tận hưởng, khám phá, thư giãn...)",
    "keywords": ["từ khóa liên quan"]
  },
  "experiences": {
    "description": "những trải nghiệm họ muốn (kích thích, yên tĩnh, khám phá, học hỏi...)",
    "keywords": ["thám hiểm", "khám phá", "thử thách"]
  },
  "environment": {
    "description": "loại môi trường (hoang sơ, nhân tạo, tự nhiên, đô thị...)",
    "keywords": ["hoang sơ", "rừng", "biển", "núi", "thôn quê"]
  },
  "gastronomy": {
    "description": "quan tâm ẩm thực (đặc sản, địa phương, mới lạ...)",
    "keywords": ["đặc sản", "ẩm thực", "địa phương"]
  },
  "intensity": "low/medium/high",
  "reason": "lý do tổng quát"
}`;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.7,
    });
    
    const text = response.output[0].content[0].text;
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
    
    if (jsonText) {
      const result = JSON.parse(jsonText);
      // Cache result
      apiCallCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (err) {
    if (err.code === 'rate_limit_exceeded') {
      console.warn("⚠️ Rate limited! Returning minimal preferences");
      return {
        travelStyle: { description: "khám phá", keywords: ["khám phá"] },
        experiences: { description: "mạo hiểm", keywords: ["mạo hiểm"] },
        environment: { description: "tự nhiên", keywords: ["tự nhiên"] },
        gastronomy: { description: "đặc sản", keywords: ["đặc sản"] },
        intensity: "medium",
        reason: "khám phá"
      };
    }
    console.warn("⚠️ AI preference extraction failed:", err);
  }
  
  return null;
}

// 🧠 NEW: Local semantic scoring (NO API CALL - faster & cheaper!)
function calculateSemanticTourScore(tour, userPreferences, itineraryTexts) {
  const tourFullText = `${tour.name} ${tour.description} ${itineraryTexts}`.toLowerCase();
  
  let score = 0;
  const reasons = [];
  
  // 1️⃣ Travel Style Match (0-20)
  let travelStyleMatch = 0;
  if (userPreferences.travelStyle?.keywords) {
    userPreferences.travelStyle.keywords.forEach(kw => {
      if (tourFullText.includes(kw.toLowerCase())) {
        travelStyleMatch += 10;
      }
    });
  }
  travelStyleMatch = Math.min(travelStyleMatch, 20);
  if (travelStyleMatch > 0) reasons.push(`phù hợp với phong cách ${userPreferences.travelStyle?.description || ''}`);
  
  // 2️⃣ Experience Match (0-25)
  let experienceMatch = 0;
  if (userPreferences.experiences?.keywords) {
    userPreferences.experiences.keywords.forEach(kw => {
      if (tourFullText.includes(kw.toLowerCase())) {
        experienceMatch += 8;
      }
    });
  }
  experienceMatch = Math.min(experienceMatch, 25);
  if (experienceMatch > 0) reasons.push(`có ${userPreferences.experiences?.description || 'trải nghiệm'}`);
  
  // 3️⃣ Environment Match (0-20)
  let environmentMatch = 0;
  if (userPreferences.environment?.keywords) {
    userPreferences.environment.keywords.forEach(kw => {
      if (tourFullText.includes(kw.toLowerCase())) {
        environmentMatch += 10;
      }
    });
  }
  environmentMatch = Math.min(environmentMatch, 20);
  if (environmentMatch > 0) reasons.push(`có ${userPreferences.environment?.description || 'môi trường'}`);
  
  // 4️⃣ Gastronomy Match (0-15)
  let gastronomyMatch = 0;
  if (userPreferences.gastronomy?.keywords) {
    userPreferences.gastronomy.keywords.forEach(kw => {
      if (tourFullText.includes(kw.toLowerCase())) {
        gastronomyMatch += 7;
      }
    });
  }
  gastronomyMatch = Math.min(gastronomyMatch, 15);
  if (gastronomyMatch > 0) reasons.push(`có ${userPreferences.gastronomy?.description || 'ẩm thực'}`);
  
  // 5️⃣ Overall Relevance (0-20)
  let overallRelevance = 0;
  const matchedCategories = [travelStyleMatch > 0, experienceMatch > 0, environmentMatch > 0, gastronomyMatch > 0]
    .filter(Boolean).length;
  overallRelevance = matchedCategories * 5;
  overallRelevance = Math.min(overallRelevance, 20);
  
  // Rating bonus
  const ratingBonus = parseFloat(tour.avg_rating || 0) * 2;
  
  const totalScore = travelStyleMatch + experienceMatch + environmentMatch + gastronomyMatch + overallRelevance + ratingBonus;
  
  return {
    travelStyleMatch,
    experienceMatch,
    environmentMatch,
    gastronomyMatch,
    overallRelevance,
    reasoning: reasons.length > 0 ? reasons.join(", ") : "Không phù hợp",
    totalScore: Math.min(totalScore, 100)
  };
}

// 🔥 OPTIMIZED: Use AI to extract keywords with rate limit handling
const apiCallCache = new Map(); // Cache API responses
const CACHE_TTL = 3600000; // 1 hour

async function extractKeywordsWithAI(message) {
  try {
    // Check cache first
    const cacheKey = `keywords:${message}`;
    const cached = apiCallCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("📦 Using cached keywords");
      return cached.data;
    }

    const prompt = `Phân tích câu hỏi du lịch sau và trích xuất TẤT CẢ các yếu tố quan trọng:

Câu hỏi: "${message}"

Hãy trích xuất:
1. Địa điểm (locations): tên thành phố, tỉnh, vùng miền
2. Hoạt động (activities): du thuyền, leo núi, tắm biển, ăn hải sản, tham quan...
3. Phong cách (style): nghỉ dưỡng, mạo hiểm, văn hóa, ẩm thực...
4. Đặc điểm (features): biển, núi, rừng, đảo, vịnh, động...

Trả về JSON (KHÔNG có text khác):
{
  "locations": ["địa điểm 1", "địa điểm 2"],
  "activities": ["hoạt động 1", "hoạt động 2"],
  "style": ["phong cách 1"],
  "features": ["đặc điểm 1", "đặc điểm 2"],
  "keywords": ["tất cả keywords quan trọng"]
}`;

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });
    
    const text = response.output[0].content[0].text;
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0];
    
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      const result = {
        locations: parsed.locations || [],
        activities: parsed.activities || [],
        style: parsed.style || [],
        features: parsed.features || [],
        allKeywords: parsed.keywords || []
      };
      
      // Cache result
      apiCallCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (err) {
    if (err.code === 'rate_limit_exceeded') {
      console.warn("⚠️ Rate limited! Returning fallback keywords");
      return {
        locations: [],
        activities: [],
        style: [],
        features: [],
        allKeywords: message.toLowerCase().split(" ").filter(x => x.length > 2)
      };
    }
    console.warn("⚠️ AI keyword extraction failed:", err);
  }
  
  return null;
}

// 🔥 NEW: Detect if message is a follow-up question
function isFollowUpQuestion(message) {
  const lowerMsg = message.toLowerCase();
  
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
  
  const matchesWholeWord = (text, keyword) => {
    if (keyword.length < 4) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    }
    return text.includes(keyword.toLowerCase());
  };
  
  if (keywordData.locations) {
    keywordData.locations.forEach(loc => {
      if (matchesWholeWord(tourText, loc)) {
        score += 10;
        matchDetails.locations++;
        if (matchesWholeWord(tourName, loc)) score += 15;
      }
    });
  }
  
  if (keywordData.activities) {
    keywordData.activities.forEach(activity => {
      if (matchesWholeWord(tourText, activity)) {
        score += 8;
        matchDetails.activities++;
        if (matchesWholeWord(tourName, activity)) score += 12;
      }
    });
  }
  
  if (keywordData.features) {
    keywordData.features.forEach(feature => {
      if (matchesWholeWord(tourText, feature)) {
        score += 5;
        matchDetails.features++;
        if (matchesWholeWord(tourName, feature)) score += 7;
      }
    });
  }
  
  if (keywordData.style) {
    keywordData.style.forEach(s => {
      if (matchesWholeWord(tourText, s)) {
        score += 5;
        matchDetails.style++;
        if (matchesWholeWord(tourName, s)) score += 7;
      }
    });
  }
  
  if (keywordData.allKeywords) {
    keywordData.allKeywords.forEach(kw => {
      if (matchesWholeWord(tourText, kw)) {
        score += 3;
        matchDetails.keywords++;
      }
    });
  }
  
  const categoriesWithMatches = [
    matchDetails.locations > 0,
    matchDetails.activities > 0,
    matchDetails.features > 0,
    matchDetails.style > 0
  ].filter(Boolean).length;
  
  if (matchDetails.locations === 0 && matchDetails.activities === 0 && matchDetails.features === 0) {
    return { score: 0, matchDetails };
  }
  
  if (categoriesWithMatches >= 2) {
    score *= 1.3;
  }
  if (categoriesWithMatches >= 3) {
    score *= 1.5;
  }
  
  score += parseFloat(tour.avg_rating || 0) * 0.5;
  score += Math.min(parseInt(tour.total_bookings || 0) * 0.1, 3);
  
  return { score, matchDetails };
}

// 🧠 NEW: Smart semantic matching workflow
async function smartTourMatching(message, tours, itineraryMap) {
  console.log("🧠 Starting smart semantic matching...");
  
  const userPreferences = await extractUserPreferences(message);
  console.log("📊 User preferences:", JSON.stringify(userPreferences, null, 2));
  
  if (!userPreferences) {
    console.warn("⚠️ Could not extract preferences");
    return null;
  }
  
  const scoredTours = [];
  
  for (const tour of tours) {
    const itTexts = (itineraryMap[tour.tour_id] || [])
      .map((it) => `${it.title} ${it.description}`)
      .join(" ");
    
    const semanticScore = await calculateSemanticTourScore(tour, userPreferences, itTexts);
    
    if (semanticScore) {
      scoredTours.push({
        ...tour,
        itineraries: itineraryMap[tour.tour_id] || [],
        semanticScore,
        finalScore: semanticScore.totalScore
      });
    }
  }
  
  const sortedTours = scoredTours
    .sort((a, b) => b.finalScore - a.finalScore)
    .filter(t => t.finalScore >= 50);
  
  console.log("🎯 Semantic matching results:");
  sortedTours.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}: ${t.finalScore.toFixed(1)}/100 - ${t.semanticScore.reasoning}`);
  });
  
  return sortedTours.slice(0, 3);
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

    // 4️⃣ Query tours
    let tours = [];
    let matchedTours = [];
    
    if (isFollowUp && previousContext && previousContext.tours.length > 0) {
      matchedTours = previousContext.tours;
      console.log("✅ Returning", matchedTours.length, "tours from context");
    } else {
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

      // 7️⃣ Filter by price range
      let candidateTours = tours;
      if (pricePref && typeof pricePref === "object") {
        candidateTours = candidateTours.filter((t) => {
          const price = Number(t.price || 0);
          return price >= (pricePref.min || 0) && price <= (pricePref.max || Number.MAX_SAFE_INTEGER);
        });
      }

      // 🧠 Try smart semantic matching first
      matchedTours = await smartTourMatching(message, candidateTours, itineraryMap);
      console.log(`🧠 Smart matching found ${matchedTours?.length || 0} tours`);

      // Fallback to keyword matching if smart matching didn't work
      if (!matchedTours || matchedTours.length === 0) {
        console.log("⚠️ Smart matching returned no results, trying keyword matching...");
        
        const keywordData = await extractKeywordsWithAI(message);
        console.log("🔑 Extracted keyword data:", JSON.stringify(keywordData, null, 2));
        
        if (keywordData) {
          let specificTourName = null;
          const tourNameMatch = message.match(/tour\s+([a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s\-–—]+)/i);
          if (tourNameMatch && tourNameMatch[1].length > 5) {
            specificTourName = tourNameMatch[1].trim();
            console.log("🎯 Specific tour requested:", specificTourName);
          }

          const scoredTours = candidateTours.map((t) => {
            const itTexts = (itineraryMap[t.tour_id] || [])
              .map((it) => `${it.title} ${it.description}`.toLowerCase())
              .join(" ");
            
            const { score, matchDetails } = calculateTourScore(t, keywordData, itTexts);
            
            let finalScore = score;
            
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

          if (finalSorted.length > 0) {
            const topScore = finalSorted[0].score;
            const minScore = Math.max(8, topScore * 0.4);
            
            finalSorted = finalSorted.filter(t => t.score >= minScore);
            
            console.log(`🎯 Top score: ${topScore.toFixed(1)}, Min threshold: ${minScore.toFixed(1)}`);
            console.log(`📊 Filtered scores: ${finalSorted.slice(0, 5).map(t => `${t.score.toFixed(1)} (${JSON.stringify(t.matchDetails)})`).join(', ')}`);
          }

          matchedTours = finalSorted.slice(0, 3);
          console.log(`✅ Found ${matchedTours.length} highly relevant tours`);
        }
      }
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
    const prompt = matchedTours.length > 0 ? 
    `Bạn là trợ lý du lịch chuyên nghiệp. ${isFollowUp ? "Câu hỏi TIẾP THEO về tour đã tư vấn." : "Yêu cầu MỚI."}

Lịch sử:
${historyText}

Yêu cầu: "${message}"

Tours phù hợp:
${matchedTours.map((t, i) => `
${i + 1}. ${t.name}
   Giá: ${t.price?.toLocaleString()} ${t.currency || "VND"}
   Thời gian: ${t.start_date} → ${t.end_date}
   Đánh giá: ${parseFloat(t.avg_rating || 0).toFixed(1)}⭐
   ${t.semanticScore ? `Phù hợp: ${t.semanticScore.reasoning}` : ''}
`).join("\n")}

Hướng dẫn:
- Gợi ý tour PHÙ HỢP NHẤT, giải thích rõ LÝ DO
- Làm nổi bật điểm ĐẶC BIỆT
- Kết thúc: "Bạn muốn biết thêm về tour nào?"

Trả lời ngắn gọn, thân thiện (3-5 câu).`
    :
    `Bạn là trợ lý du lịch chuyên nghiệp.

Lịch sử:
${historyText}

Yêu cầu: "${message}"

⚠️ QUAN TRỌNG: Hiện tại KHÔNG CÓ tour nào trong hệ thống phù hợp với yêu cầu này.

Hướng dẫn trả lời:
- Thông báo rõ ràng: "Xin lỗi, hiện tại chúng tôi chưa có tour nào phù hợp với yêu cầu của bạn"
- KHÔNG được tự sáng tạo hoặc gợi ý tour không có trong hệ thống
- Gợi ý: "Bạn có thể thử tìm kiếm với các tiêu chí khác hoặc để lại thông tin, chúng tôi sẽ liên hệ khi có tour phù hợp"

Trả lời ngắn gọn, thân thiện (2-3 câu).`;

    let aiReply;
    try {
      const completion = await openai.responses.create({
        model: "gpt-4o",
        input: prompt,
        temperature: 0.7,
      });
      aiReply = completion.output[0].content[0].text;
    } catch (err) {
      console.warn("⚠️ gpt-4o failed, using gpt-4o-mini");
      const completion = await openai.responses.create({
        model: "gpt-4o-mini",
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
      isFollowUp
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
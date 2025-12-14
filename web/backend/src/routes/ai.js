const express = require("express");
const router = express.Router();
const openai = require("../../config/openai");
const { pool } = require("../../config/mysql");
const { v4: uuidv4 } = require("uuid");

// ============ CONFIG ============
const CONFIG = {
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 3600000,
  MAX_CACHE_SIZE: 100,
  MAX_TOURS_RESULT: 3,
  AI_TIMEOUT: parseInt(process.env.AI_TIMEOUT) || 10000,
  MAX_MESSAGE_LENGTH: 1000,
  MIN_MESSAGE_LENGTH: 5,
  RATE_LIMIT_MS: 1000,
};

// ============ LRU CACHE ============
class LRUCache {
  constructor(maxSize = CONFIG.MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

const apiCallCache = new LRUCache(CONFIG.MAX_CACHE_SIZE);
const rateLimitCache = new Map();

// ============ LOGGER ============
const logger = {
  info: (action, data = {}) => 
    console.log(`[INFO] ${action}`, JSON.stringify(data)),
  warn: (action, data = {}) => 
    console.warn(`[WARN] ${action}`, JSON.stringify(data)),
  error: (action, err) => 
    console.error(`[ERROR] ${action}`, err.message, err.stack),
};

// ============ VALIDATION ============
function validateInput(user_id, message) {
  if (!user_id || typeof user_id !== 'string' || user_id.trim().length === 0) {
    throw new Error('Invalid user_id');
  }
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message');
  }
  const trimmed = message.trim();
  if (trimmed.length < CONFIG.MIN_MESSAGE_LENGTH || trimmed.length > CONFIG.MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${CONFIG.MIN_MESSAGE_LENGTH}-${CONFIG.MAX_MESSAGE_LENGTH} characters`);
  }
  return trimmed;
}

function checkRateLimit(user_id) {
  const now = Date.now();
  const last = rateLimitCache.get(user_id) || 0;

  if (now - last < CONFIG.RATE_LIMIT_MS) {
    throw new Error('Too many requests. Please wait a moment.');
  }

  rateLimitCache.set(user_id, now);
  
  if (rateLimitCache.size > 10000) {
    const cutoff = now - 60000;
    for (const [key, time] of rateLimitCache.entries()) {
      if (time < cutoff) rateLimitCache.delete(key);
    }
  }
}

// ============ TIMEOUT HELPER ============
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

// ============ OPENAI API ============
async function callOpenAI(prompt, model = "gpt-4o-mini", temperature = 0.7) {
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
      }),
      CONFIG.AI_TIMEOUT
    );
    return response.choices[0].message.content;
  } catch (err) {
    if (err.message.includes('timeout')) {
      logger.warn('openai_timeout', { model });
      throw new Error('AI response timeout');
    }
    if (err.code === 'rate_limit_exceeded') {
      logger.warn('openai_rate_limit', { model });
      throw new Error('AI service rate limited');
    }
    throw err;
  }
}
// ============ AI SUGGESTED TOUR OVERRIDE ============

// Trích tên tour AI gợi ý từ text
function extractSuggestedTourFromAI(aiText) {
  if (!aiText) return null;

  // Bắt các dạng phổ biến: **Tên tour**, "Tên tour", Tour Tên tour
  const patterns = [
    /\*\*(.*?)\*\*/i,
    /tour\s+"([^"]+)"/i,
    /tour\s+([A-ZĐ][^.\n]+)/i
  ];

  for (const regex of patterns) {
    const match = aiText.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// Ép tour gợi ý lên đầu danh sách
function prioritizeSuggestedTour(tours, suggestedName) {
  if (!suggestedName || !Array.isArray(tours)) return tours;

  const index = tours.findIndex(t =>
    t.name.toLowerCase().includes(suggestedName.toLowerCase())
  );

  if (index <= 0) return tours; // đã ở top hoặc không tìm thấy

  const [tour] = tours.splice(index, 1);
  tour.isAiSuggested = true; // flag cho frontend (nếu cần)
  return [tour, ...tours];
}

// ============ KEYWORD-BASED INTENT EXTRACTION (NÂNG CAO) ============
function extractKeywordBasedIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  const intent = {
    weather: [],
    environment: [],
    vibe: [],
    motivations: [],
    keywords: [],
    energy: 'medium',
    location: null,
    confidence: 0.6,
    source: 'keyword'
  };

  // ========== THỜI TIẾT & KHÔNG KHÍ ==========
  // Mát mẻ / Lạnh
  if (/\b(mát|lạnh|mát mẻ|se lạnh|mát rượi|mát lạnh)\b/i.test(lowerMsg)) {
    intent.weather.push('cool_climate');
    intent.keywords.push('mát mẻ');
  }
  
  // Trong lành / Sạch
  if (/\b(trong lành|không khí (sạch|tốt|trong)|sạch sẽ|tốt cho sức kh[ỏo]e|không khí tốt|khí hậu tốt)\b/i.test(lowerMsg)) {
    intent.weather.push('clean_air');
    intent.keywords.push('trong lành');
  }
  
  // Yên tĩnh / Ít người
  if (/\b(yên tĩnh|yên|vắng|ít người|vắng vẻ|thanh tĩnh|không ồn|không đông|vắng người)\b/i.test(lowerMsg)) {
    intent.weather.push('quiet_environment');
    intent.vibe.push('peaceful');
    intent.keywords.push('yên tĩnh');
  }
  
  // Đông đúc / Vui vẻ
  if (/\b(đông đúc|đông|náo nhiệt|sôi động|vui vẻ|nhộn nhịp|đông người)\b/i.test(lowerMsg)) {
    intent.weather.push('crowded_environment');
    intent.vibe.push('lively');
    intent.keywords.push('sôi động');
  }
  
  // Biển / Nước
  if (/\b(biển|nước|tắm biển|bãi biển|ven biển|gần biển)\b/i.test(lowerMsg)) {
    intent.weather.push('water_environment');
    intent.environment.push('water');
    intent.keywords.push('biển');
  }

  // ========== MÔI TRƯỜNG ==========
  // Thiên nhiên
  if (/\b(thiên nhiên|núi|rừng|thác|suối|cao nguyên|đồi|thung lũng|cây cối)\b/i.test(lowerMsg)) {
    intent.environment.push('nature');
    intent.keywords.push('thiên nhiên');
    
    // Phân biệt: hoang dã vs du lịch
    if (/\b(không quá hoang dá|không hoang dá|du lịch|có dịch vụ|tiện nghi|dễ đi)\b/i.test(lowerMsg)) {
      intent.vibe.push('peaceful');
      intent.energy = 'low';
      intent.keywords.push('dễ đi');
    } else if (/\b(hoang dá|nguyên sinh|trekking|khó)\b/i.test(lowerMsg)) {
      intent.vibe.push('adventurous');
      intent.energy = 'high';
      intent.keywords.push('thử thách');
    }
  }
  
  // Thành phố / Phố cổ
  if (/\b(phố|phố cổ|thành phố|thành|quán|ăn uống|cafe|cà phê|quán ăn)\b/i.test(lowerMsg)) {
    intent.environment.push('urban');
    intent.keywords.push('phố');
  }
  
  // Văn hóa
  if (/\b(văn hóa|di tích|bảo tàng|chùa|đền|lịch sử|di sản|cổ kính)\b/i.test(lowerMsg)) {
    intent.environment.push('cultural');
    intent.motivations.push('learning');
    intent.keywords.push('văn hóa');
  }

  // ========== MỤC ĐÍCH ==========
  // Chụp ảnh
  if (/\b(chụp ảnh|ảnh|cảnh đẹp|check[- ]?in|sống ảo|hoàng hôn|view đẹp|ngắm cảnh)\b/i.test(lowerMsg)) {
    intent.motivations.push('photography');
    intent.vibe.push('romantic');
    intent.keywords.push('chụp ảnh');
  }
  
  // Ẩm thực
  if (/\b(ăn|ẩm thực|hải sản|đặc sản|món|quán|mì|phở|cơm|thử món)\b/i.test(lowerMsg)) {
    intent.motivations.push('cuisine');
    intent.keywords.push('ẩm thực');
  }
  
  // Nghỉ ngơi / Thư giãn
  if (/\b(nghỉ|nghỉ ngơi|thư giãn|thư thái|spa|massage|không cần đi nhiều|nhẹ nhàng|thả lỏng|relax)\b/i.test(lowerMsg)) {
    intent.motivations.push('wellness');
    intent.vibe.push('peaceful');
    intent.energy = 'low';
    intent.keywords.push('thư giãn');
  }
  
  // Khám phá
  if (/\b(khám phá|mới lạ|độc đáo|trải nghiệm|mới mẻ|lạ)\b/i.test(lowerMsg)) {
    intent.motivations.push('discovery');
    intent.keywords.push('khám phá');
  }
  
  // Mạo hiểm
  if (/\b(mạo hiểm|leo|trekking|bơi|snorkel|lặn|phượt|thử thách|extreme)\b/i.test(lowerMsg)) {
    intent.motivations.push('adventure');
    intent.vibe.push('adventurous');
    intent.energy = 'high';
    intent.keywords.push('mạo hiểm');
  }

  // ========== MỨC ĐỘ HOẠT ĐỘNG ==========
  if (/\b(nghỉ ngơi|nhẹ nhàng|không đi nhiều|ngồi|ngắm|thưởng thức|không cần di chuyển nhiều)\b/i.test(lowerMsg)) {
    intent.energy = 'low';
  } else if (/\b(đi chơi|khám phá|tham quan|đi dạo)\b/i.test(lowerMsg)) {
    intent.energy = 'medium';
  } else if (/\b(leo|bơi|chạy|thể thao|trekking|vận động)\b/i.test(lowerMsg)) {
    intent.energy = 'high';
  }

  // ========== ĐỊA ĐIỂM ==========
  const locationPatterns = [
    { regex: /\b(đà lạt|da lat|dalat)\b/i, name: 'đà lạt' },
    { regex: /\b(hà giang|ha giang)\b/i, name: 'hà giang' },
    { regex: /\b(hạ long|ha long|vịnh hạ long|halong)\b/i, name: 'hạ long' },
    { regex: /\b(hội an|hoi an|hoian)\b/i, name: 'hội an' },
    { regex: /\b(đà nẵng|da nang|danang)\b/i, name: 'đà nẵng' },
    { regex: /\b(sapa|sa pa)\b/i, name: 'sapa' },
    { regex: /\b(phú quốc|phu quoc)\b/i, name: 'phú quốc' },
    { regex: /\b(ninh bình|ninh binh)\b/i, name: 'ninh bình' },
    { regex: /\b(huế|hue)\b/i, name: 'huế' },
    { regex: /\b(nha trang)\b/i, name: 'nha trang' }
  ];
  
  for (const loc of locationPatterns) {
    if (loc.regex.test(lowerMsg)) {
      intent.location = loc.name;
      intent.keywords.push(loc.name);
      break;
    }
  }

  // ========== TÍNH CONFIDENCE ==========
  const totalSignals = intent.weather.length + intent.environment.length + 
                       intent.vibe.length + intent.motivations.length + 
                       (intent.location ? 1 : 0);
  
  intent.confidence = Math.min(0.9, 0.5 + (totalSignals * 0.08));

  return intent;
}

// ============ AI-POWERED INTENT ANALYSIS (NÂNG CAO) ============
async function analyzeUserIntent(message) {
  try {
    const cacheKey = `intent:${message.substring(0, 50)}`;
    const cached = apiCallCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
      logger.info('cache_hit', { type: 'intent' });
      return cached.data;
    }

    // ✅ BƯỚC 1: Phân tích bằng AI với prompt chi tiết
    const prompt = `Bạn là chuyên gia phân tích ý định du lịch. Phân tích CẨN THẬN câu hỏi sau và trích xuất CHÍNH XÁC các yếu tố:

"${message}"

HƯỚNG DẪN PHÂN TÍCH CHI TIẾT:

1. **Thời tiết/Không khí** (desired_weather):
   - "mát mẻ", "lạnh", "se lạnh" → cool_climate
   - "trong lành", "sạch", "tốt cho sức khỏe", "không khí tốt" → clean_air
   - "yên tĩnh", "vắng", "ít người", "không đông" → quiet_environment
   - "đông đúc", "sôi động", "náo nhiệt" → crowded_environment
   - "biển", "nước", "tắm biển" → water_environment

2. **Môi trường** (desired_environment):
   - "thiên nhiên", "núi", "rừng", "thác", "suối" → nature
   - "không quá hoang dã", "có du lịch" → nature (moderate)
   - "phố", "thành phố", "quán ăn" → urban
   - "văn hóa", "di tích", "bảo tàng" → cultural
   - "biển", "nước" → water

3. **Phong cách** (desired_vibe):
   - "yên tĩnh", "nghỉ ngơi", "thư giãn" → peaceful
   - "vui vẻ", "náo nhiệt", "sôi động" → lively
   - "chụp ảnh", "cảnh đẹp", "lãng mạn" → romantic
   - "mạo hiểm", "thử thách" → adventurous

4. **Mức độ hoạt động** (desired_energy):
   - "nghỉ ngơi", "nhẹ nhàng", "không đi nhiều" → low
   - "khám phá", "đi chơi", "tham quan" → medium
   - "leo núi", "trekking", "mạo hiểm" → high

5. **Mục đích** (desired_motivations):
   - "chụp ảnh", "cảnh đẹp" → photography
   - "ăn", "ẩm thực", "hải sản" → cuisine
   - "nghỉ", "thư giãn", "spa" → wellness
   - "khám phá", "mới lạ" → discovery
   - "văn hóa", "lịch sử" → learning
   - "mạo hiểm", "thử thách" → adventure

6. **Địa điểm** (explicit_location): Chỉ điền nếu người dùng NHẮC CỤ THỂ tên địa điểm

7. **Keywords**: Các từ khóa QUAN TRỌNG trong câu hỏi

Trả về JSON (KHÔNG có markdown, KHÔNG có comment):
{
  "desired_weather": [],
  "desired_environment": [],
  "desired_vibe": [],
  "desired_energy": "low|medium|high",
  "desired_motivations": [],
  "explicit_location": null,
  "keywords": [],
  "confidence": 0.85,
  "summary": "Tóm tắt ngắn gọn ý định người dùng"
}`;

    const text = await callOpenAI(prompt, "gpt-4o");
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').match(/\{[\s\S]*\}/)?.[0];

    if (jsonText) {
      const aiResult = JSON.parse(jsonText);
      
      // ✅ BƯỚC 2: Kết hợp với keyword matching để tăng độ chính xác
      const keywordResult = extractKeywordBasedIntent(message);
      
      // ✅ BƯỚC 3: Merge kết quả (ưu tiên AI nhưng bổ sung từ keyword)
      const mergedResult = {
        desired_weather: [...new Set([...(aiResult.desired_weather || []), ...keywordResult.weather])],
        desired_environment: [...new Set([...(aiResult.desired_environment || []), ...keywordResult.environment])],
        desired_vibe: [...new Set([...(aiResult.desired_vibe || []), ...keywordResult.vibe])],
        desired_energy: aiResult.desired_energy || keywordResult.energy || 'medium',
        desired_motivations: [...new Set([...(aiResult.desired_motivations || []), ...keywordResult.motivations])],
        explicit_location: aiResult.explicit_location || keywordResult.location,
        keywords: [...new Set([...(aiResult.keywords || []), ...keywordResult.keywords])],
        confidence: Math.max(aiResult.confidence || 0.8, keywordResult.confidence),
        summary: aiResult.summary || `Khách muốn ${keywordResult.keywords.join(', ')}`,
        source: 'ai_hybrid'
      };

      apiCallCache.set(cacheKey, { data: mergedResult, timestamp: Date.now() });
      
      logger.info('intent_analyzed_hybrid', {
        weather: mergedResult.desired_weather,
        environment: mergedResult.desired_environment,
        vibe: mergedResult.desired_vibe,
        motivations: mergedResult.desired_motivations,
        keywords: mergedResult.keywords,
        confidence: mergedResult.confidence,
        source: 'ai_hybrid'
      });
      
      return mergedResult;
    }
  } catch (err) {
    logger.error('analyze_user_intent_ai_failed', err);
  }

  // ✅ FALLBACK: Nếu AI thất bại, dùng keyword matching thuần
  logger.warn('fallback_to_keyword_only', {});
  const keywordResult = extractKeywordBasedIntent(message);
  
  // Convert để đồng nhất format với AI result
  return {
    desired_weather: keywordResult.weather,
    desired_environment: keywordResult.environment,
    desired_vibe: keywordResult.vibe,
    desired_energy: keywordResult.energy,
    desired_motivations: keywordResult.motivations,
    explicit_location: keywordResult.location,
    keywords: keywordResult.keywords,
    confidence: keywordResult.confidence,
    summary: `Khách muốn ${keywordResult.keywords.join(', ')}`,
    source: 'keyword_only'
  };
}

// ============ AI TOUR CHARACTERISTICS ANALYSIS ============
async function analyzeTourCharacteristics(tours, itineraryMap) {
  try {
    const cacheKey = `tour_analysis:all`;
    const cached = apiCallCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
      logger.info('cache_hit', { type: 'tour_analysis' });
      return cached.data;
    }

    const toursDescription = tours.slice(0, 20).map((t, i) => {
      const itTexts = (itineraryMap[t.tour_id] || [])
        .map(it => `${it.title}`)
        .join(", ");
      return `${i + 1}. ${t.name} (Hoạt động: ${itTexts})`;
    }).join('\n');

    const prompt = `Bạn là chuyên gia phân tích tour du lịch. 
Phân tích đặc điểm THỰC TẾ của mỗi tour (dựa vào tên, hoạt động, địa điểm):

${toursDescription}

Trả về JSON:
{
  "tours": [
    {
      "name": "tên tour",
      "actual_weather": ["cool_climate", "clean_air", "quiet_environment", "water_environment"],
      "actual_environment": ["urban", "nature", "water", "cultural"],
      "actual_vibe": ["peaceful", "lively", "romantic", "adventurous"],
      "actual_energy": "low|medium|high",
      "actual_motivations": ["cuisine", "discovery", "photography", "wellness", "adventure"]
    }
  ]
}`;

    const text = await callOpenAI(prompt, "gpt-4o");
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').match(/\{[\s\S]*\}/)?.[0];

    if (jsonText) {
      const result = JSON.parse(jsonText);
      const tourCharMap = {};
      (result.tours || []).forEach(t => {
        tourCharMap[t.name.toLowerCase()] = t;
      });

      apiCallCache.set(cacheKey, { data: tourCharMap, timestamp: Date.now() });
      logger.info('tour_analysis_complete', { count: Object.keys(tourCharMap).length });
      return tourCharMap;
    }
  } catch (err) {
    logger.error('analyze_tour_characteristics', err);
  }

  return {};
}

// ============ SMART MATCHING VỚI TRỌNG SỐ ƯU TIÊN ============
async function smartMatchTours(tours, itineraryMap, userIntent, tourCharMap) {
  logger.info('smart_match_start', {
    tourCount: tours.length,
    intentKeywords: userIntent?.keywords,
    confidence: userIntent?.confidence
  });

  if (!userIntent || (!userIntent.keywords?.length && !userIntent.desired_motivations?.length)) {
    logger.warn('smart_match_failed', { reason: 'no_valid_intent' });
    return [];
  }

  const scoredTours = tours.map(tour => {
    const tourName = tour.name.toLowerCase();
    const tourChars = tourCharMap[tourName];

    let score = 0;
    const matchReasons = [];
    const matchDetails = {};

    // Thu thập text để phân tích
    const itTexts = (itineraryMap[tour.tour_id] || [])
      .map(it => `${it.title} ${it.description || ''}`)
      .join(" ")
      .toLowerCase();
    const combinedText = `${tourName} ${tour.description || ''}`.toLowerCase();
    const fullText = `${combinedText} ${itTexts}`;

    // ============ 1. KEYWORD MATCHING (Trọng số cao nhất: 100 điểm) ============
    const keywordMatches = (userIntent.keywords || []).filter(kw => 
      fullText.includes(kw.toLowerCase())
    );
    
    if (keywordMatches.length > 0) {
      const keywordScore = keywordMatches.length * 25; // Mỗi keyword = 25 điểm
      score += keywordScore;
      matchDetails.keywordScore = keywordScore;
      matchReasons.push(`✓ ${keywordMatches.slice(0, 3).join(', ')}`);
    }

    // ============ 2. AI CHARACTERISTICS MATCHING (80 điểm) ============
    if (tourChars) {
      // Weather matching (20 điểm)
      const weatherMatches = (tourChars.actual_weather || []).filter(w => 
        (userIntent.desired_weather || []).includes(w)
      ).length;
      if (weatherMatches > 0) {
        const weatherScore = weatherMatches * 10;
        score += weatherScore;
        matchDetails.weatherScore = weatherScore;
        
        const weatherLabels = {
          'cool_climate': 'Mát mẻ',
          'clean_air': 'Trong lành',
          'quiet_environment': 'Yên tĩnh',
          'water_environment': 'Gần nước',
          'crowded_environment': 'Sôi động'
        };
        const matched = (tourChars.actual_weather || [])
          .filter(w => (userIntent.desired_weather || []).includes(w))
          .map(w => weatherLabels[w] || w);
        if (matched.length > 0) {
          matchReasons.push(`🌤️ ${matched.join(', ')}`);
        }
      }

      // Environment matching (20 điểm)
      const envMatches = (tourChars.actual_environment || []).filter(e => 
        (userIntent.desired_environment || []).includes(e)
      ).length;
      if (envMatches > 0) {
        const envScore = envMatches * 10;
        score += envScore;
        matchDetails.envScore = envScore;
        
        const envLabels = {
          'nature': 'Thiên nhiên',
          'urban': 'Thành phố',
          'cultural': 'Văn hóa',
          'water': 'Biển'
        };
        const matched = (tourChars.actual_environment || [])
          .filter(e => (userIntent.desired_environment || []).includes(e))
          .map(e => envLabels[e] || e);
        if (matched.length > 0) {
          matchReasons.push(`🏞️ ${matched.join(', ')}`);
        }
      }

      // Vibe matching (20 điểm)
      const vibeMatches = (tourChars.actual_vibe || []).filter(v => 
        (userIntent.desired_vibe || []).includes(v)
      ).length;
      if (vibeMatches > 0) {
        const vibeScore = vibeMatches * 10;
        score += vibeScore;
        matchDetails.vibeScore = vibeScore;
        
        const vibeLabels = {
          'peaceful': 'Yên bình',
          'lively': 'Sôi động',
          'romantic': 'Lãng mạn',
          'adventurous': 'Mạo hiểm'
        };
        const matched = (tourChars.actual_vibe || [])
          .filter(v => (userIntent.desired_vibe || []).includes(v))
          .map(v => vibeLabels[v] || v);
        if (matched.length > 0) {
          matchReasons.push(`💫 ${matched.join(', ')}`);
        }
      }

      // Motivation matching (20 điểm)
      const motivationMatches = (tourChars.actual_motivations || []).filter(m => 
        (userIntent.desired_motivations || []).includes(m)
      ).length;
      if (motivationMatches > 0) {
        const motScore = motivationMatches * 10;
        score += motScore;
        matchDetails.motivationScore = motScore;
        
        const motLabels = {
          'photography': 'Chụp ảnh',
          'cuisine': 'Ẩm thực',
          'wellness': 'Nghỉ dưỡng',
          'discovery': 'Khám phá',
          'adventure': 'Mạo hiểm',
          'learning': 'Văn hóa'
        };
        const matched = (tourChars.actual_motivations || [])
          .filter(m => (userIntent.desired_motivations || []).includes(m))
          .map(m => motLabels[m] || m);
        if (matched.length > 0) {
          matchReasons.push(`🎯 ${matched.join(', ')}`);
        }
      }
    }

    // ============ 3. LOCATION MATCHING (50 điểm) ============
    if (userIntent.explicit_location) {
      const locLower = userIntent.explicit_location.toLowerCase();
      if (tourName.includes(locLower)) {
        score += 50;
        matchDetails.locationScore = 50;
        matchReasons.push(`📍 ${userIntent.explicit_location}`);
      }
    }

    // ============ 4. QUALITY BONUS (15 điểm) ============
    const ratingBonus = (parseFloat(tour.avg_rating || 0) / 5) * 10;
    const bookingBonus = Math.min((parseInt(tour.total_bookings || 0) / 1000) * 5, 5);
    const qualityBonus = ratingBonus + bookingBonus;
    
    score += qualityBonus;
    matchDetails.qualityBonus = Math.round(qualityBonus);

    if (parseFloat(tour.avg_rating || 0) >= 4.0) {
      matchReasons.push(`⭐ ${parseFloat(tour.avg_rating).toFixed(1)}/5`);
    }

    // ============ CONFIDENCE ADJUSTMENT ============
    const confidenceMultiplier = (userIntent.confidence || 0.8);
    score = score * confidenceMultiplier;

    return {
      ...tour,
      itineraries: itineraryMap[tour.tour_id] || [],
      matchScore: Math.round(Math.min(score, 100)),
      matchReasons: matchReasons.slice(0, 5),
      matchDetails,
      tourChars
    };
  });

  // Lọc tour có điểm > 0
  const filtered = scoredTours.filter(t => t.matchScore > 0);
  let sorted = filtered.sort((a, b) => b.matchScore - a.matchScore);
  sorted = boostTourByExplicitLocation(sorted, userIntent);
  

  logger.info('smart_match_complete', {
    matched: sorted.length,
    topScore: sorted[0]?.matchScore,
    topTour: sorted[0]?.name,
    topReasons: sorted[0]?.matchReasons
  });

  return sorted.slice(0, CONFIG.MAX_TOURS_RESULT);
}
function boostTourByExplicitLocation(sortedTours, userIntent) {
  if (!userIntent?.explicit_location) return sortedTours;

  const loc = userIntent.explicit_location.toLowerCase();

  const index = sortedTours.findIndex(t =>
    t.name.toLowerCase().includes(loc)
  );

  if (index > 0) {
    const [tour] = sortedTours.splice(index, 1);
    sortedTours.unshift(tour); // 🚀 đưa lên TOP
  }

  return sortedTours;
}


// ============ TEXT EXTRACTION HELPERS ============
function extractLocationFromMessage(message) {
  const patterns = [
    /(?:đi|tới|về|thăm|du lịch|tour)\s+(?:đến\s+)?(?:tại\s+)?([a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s\-]+?)(?:\s+(?:để|và|từ))?$/i
  ];

  const validLocations = ['đà lạt', 'hà giang', 'hạ long', 'hội an', 'ninh bình', 'đà nẵng', 'huế', 'hà nội', 'sapa', 'phú quốc', 'nha trang'];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const location = match[1].trim().toLowerCase();
      if (validLocations.some(loc => location.includes(loc))) {
        return location;
      }
    }
  }
  return null;
}

function extractDate(message) {
  const dateMatch =
    message.match(/\b(\d{1,2})[\/\-\. ]?tháng[\/\-\. ]?(\d{1,2})\b/i) ||
    message.match(/\b(\d{1,2})[\/\-\. ](\d{1,2})\b/);

  if (!dateMatch) return null;

  const day = parseInt(dateMatch[1]);
  const month = parseInt(dateMatch[2]);

  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const year = new Date().getFullYear();
  return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parsePrice(input) {
  if (!input) return null;

  const str = input
    .toString()
    .toLowerCase()
    .replace(/,/g, '')
    .trim();

  // Tìm số đầu tiên trong câu
  const numberMatch = str.match(/(\d+(\.\d+)?)/);
  if (!numberMatch) return null;

  let value = parseFloat(numberMatch[1]);
  if (!Number.isFinite(value)) return null;

  // Xác định đơn vị
  if (/(triệu|tr|m)/.test(str)) {
    value *= 1_000_000;
  } else if (/(k|nghìn)/.test(str)) {
    value *= 1_000;
  } else if (/(đ|vnd|vnđ)/.test(str)) {
    value = value;
  } else {
    // ❗ KHÔNG CÓ ĐƠN VỊ → MẶC ĐỊNH LÀ TRIỆU
    value *= 1_000_000;
  }

  return value > 0 ? Math.round(value) : null;
}


function extractPriceRange(message) {
  const lowerMsg = message.toLowerCase();

  if (/\b(rẻ nhất|giá rẻ|giá thấp|rẻ)\b/.test(lowerMsg)) {
    return { type: 'cheap' };
  }
  if (/\b(đắt nhất|giá đắt|giá cao|đắt)\b/.test(lowerMsg)) {
    return { type: 'expensive' };
  }

  const rangeRegex = /từ\s*([\d\.,\s\w]+)\s*(?:đ|vnd|triệu|k)?\s*(?:đến|-)\s*([\d\.,\s\w]+)\s*(?:đ|vnd|triệu|k)?/i;
  const lessRegex = /(?:dưới|<|ít hơn)\s*([\d\.,\s\w]+)\s*(?:đ|vnd|triệu|k)?/i;
  const moreRegex = /(?:trên|>|nhiều hơn)\s*([\d\.,\s\w]+)\s*(?:đ|vnd|triệu|k)?/i;
  const approxRegex =  /(?:có\s+)?(?:khoảng|tầm|chừng|chỉ\s+có)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|nghìn|đ|vnd)?/i;  // ✅ THÊM DÒNG NÀY
  const onlyPriceRegex = /(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|nghìn|đ|vnd)/i;

  let match = lowerMsg.match(rangeRegex);
if (match) {
  const value = parsePrice(match[1] + (match[2] ?? ''));
  if (value) {
    return {
      type: 'range',
      min: Math.round(value * 0.8),
      max: Math.round(value * 1.2)
    };
  }
}

  match = lowerMsg.match(lessRegex);
  if (match) {
    const max = parsePrice(match[1]);
    if (max) return { type: 'range', min: 0, max };
  }

  match = lowerMsg.match(moreRegex);
  if (match) {
    const min = parsePrice(match[1]);
    if (min) return { type: 'range', min, max: Number.MAX_SAFE_INTEGER };
  }
    // ✅ THÊM ĐOẠN NÀY (trước return null)
match = lowerMsg.match(approxRegex);
if (match) {
  const value = parsePrice(match[1]);
  if (value) {
    return {
      type: 'budget',
      max: value
    };
  }
}


  match = lowerMsg.match(onlyPriceRegex);
if (match) {
  const value = parsePrice(match[1] + match[2]);
  if (value) {
    return {
      type: 'range',
      min: Math.round(value * 0.8),
      max: Math.round(value * 1.2)
    };
  }
}

  return null;
}
function normalizePrice(price) {
  if (!price) return null;

  // Nếu đã là number
  if (typeof price === 'number') {
    return price > 0 ? price : null;
  }

  if (typeof price === 'string') {
    const cleaned = price
      .toLowerCase()
      .replace(/vnd|vnđ|đ/g, '')
      .replace(/,/g, '')
      .trim();

    const value = Number(cleaned);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  return null;
}


function isFollowUpQuestion(message) {
  const lowerMsg = message.toLowerCase().trim();
  const followUpPatterns = [
    /^(tư vấn|cho tôi|giới thiệu|nói thêm|chi tiết)$/,
    /^(có|được|ok|đồng ý)$/i,
    /tour\s+(này|đó|nào)/,
    /thêm về/,
    /chi tiết hơn/
  ];
  return followUpPatterns.some(pattern => pattern.test(lowerMsg));
}

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
        return { tours, lastMessage: lastMessages[0].message };
      }
    }
  } catch (err) {
    logger.error('get_context', err);
  }

  return null;
}

// ============ MAIN CHAT ROUTE ============
router.post("/chat", async (req, res) => {
  const { user_id, message: rawMessage } = req.body;

  try {
    const message = validateInput(user_id, rawMessage);
    checkRateLimit(user_id);

    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message)
       VALUES (?, ?, 'user', ?)`,
      [uuidv4(), user_id, message]
    );

    const mentionedLocation = extractLocationFromMessage(message);
    const searchDate = extractDate(message);
    const priceRange = extractPriceRange(message);
    const isFollowUp = isFollowUpQuestion(message);

    logger.info('message_analyzed', {
      location: mentionedLocation,
      isFollowUp,
      hasPrice: !!priceRange,
      hasDate: !!searchDate
    });

    let matchedTours = [];
    let userIntent = null;

    // Check if follow-up
    if (isFollowUp) {
      const previousContext = await getPreviousTourContext(user_id);
      if (previousContext?.tours.length > 0) {
        matchedTours = previousContext.tours;
        logger.info('using_previous_context', { count: matchedTours.length });
      }
    }

    // If not follow-up or no context, do full matching
    if (matchedTours.length === 0) {
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
  query += ` AND DATE(t.start_date) = DATE(?)`;
  params.push(searchDate);
}

      query += ` GROUP BY t.tour_id;`;
      const [tours] = await pool.query(query, params);

      const [itineraries] = await pool.query(`
        SELECT tour_id, day_number, title, description
        FROM tour_itineraries
        ORDER BY tour_id, day_number;
      `);

      const itineraryMap = {};
      itineraries.forEach(it => {
        if (!itineraryMap[it.tour_id]) itineraryMap[it.tour_id] = [];
        itineraryMap[it.tour_id].push(it);
      });

      // Filter by price
      let candidateTours = tours;
// if (priceRange?.type === 'range') {
//   candidateTours = candidateTours.filter(t => {
//     const basePrice = Number(t.price || 0);
//     // Giá CƠ BẢN phải <= max (vì có thể có gói cao hơn)
//     return basePrice <= priceRange.max && basePrice >= priceRange.min;
//   });
//     logger.info('price_filtered', { 
//     before: tours.length, 
//     after: candidateTours.length,
//     range: `${priceRange.min}-${priceRange.max}` 
//   });
// }
      

      // ✅ Analyze tour characteristics
      const tourCharMap = await analyzeTourCharacteristics(candidateTours, itineraryMap);

      // ✅ Analyze user intent (AI + Keyword Hybrid)
      userIntent = await analyzeUserIntent(message);
      
      logger.info('intent_analysis_complete', {
        weather: userIntent?.desired_weather,
        environment: userIntent?.desired_environment,
        keywords: userIntent?.keywords,
        confidence: userIntent?.confidence,
        source: userIntent?.source
      });

      // ✅ Smart matching nếu có intent hợp lệ
      if (userIntent && (userIntent.keywords?.length > 0 || userIntent.desired_motivations?.length > 0)) {
        matchedTours = await smartMatchTours(candidateTours, itineraryMap, userIntent, tourCharMap);


// 🔎 DEBUG GIÁ SAU SMART MATCH
matchedTours.forEach(t => {
  const normalizedPrice = normalizePrice(t.price);
  logger.info('price_debug', {
    tour: t.name,
    rawPrice: t.price,
    normalizedPrice
  });
});

        

if (priceRange?.type === 'budget') {
  matchedTours = matchedTours.filter(t => {
    const price = normalizePrice(t.price);
    if (!price) return false;
    return price <= priceRange.max;
  });

  logger.info('price_budget_applied', {
    after: matchedTours.length,
    max: priceRange.max
  });
}
// ✅ FILTER GIÁ CHO RANGE (BẮT BUỘC)
if (priceRange?.type === 'range') {
  const before = matchedTours.length;

  matchedTours = matchedTours.filter(t => {
    const price = normalizePrice(t.price);
    if (!price) return false;
    return price >= priceRange.min && price <= priceRange.max;
  });

  logger.info('price_range_applied', {
    before,
    after: matchedTours.length,
    min: priceRange.min,
    max: priceRange.max
  });
}




        
        logger.info('smart_match_result', {
          matchedCount: matchedTours.length,
          topScore: matchedTours[0]?.matchScore,
          topTour: matchedTours[0]?.name
        });
      }

      // ✅ Fallback 1: Location-based
      if ((!matchedTours || matchedTours.length === 0) && mentionedLocation) {
        logger.warn('fallback_to_location', { location: mentionedLocation });
        const locationTours = candidateTours.filter(t => 
          t.name.toLowerCase().includes(mentionedLocation.toLowerCase())
        );
        
        if (locationTours.length > 0) {
          matchedTours = locationTours
            .map(t => ({
              ...t,
              itineraries: itineraryMap[t.tour_id] || [],
              matchScore: 60 + (parseFloat(t.avg_rating || 0) * 5),
              matchReasons: [`📍 ${mentionedLocation}`, `⭐ ${parseFloat(t.avg_rating || 0).toFixed(1)}/5`]
            }))
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, CONFIG.MAX_TOURS_RESULT);
          logger.info('fallback_location_applied', { count: matchedTours.length });
        }
      }

      // ✅ Fallback 2: Price-based
      if ((!matchedTours || matchedTours.length === 0) && priceRange?.type) {
        logger.warn('fallback_to_price', { priceType: priceRange.type });
        let sortedByPrice = [...candidateTours];
        
        if (priceRange.type === 'cheap') {
          sortedByPrice.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (priceRange.type === 'expensive') {
          sortedByPrice.sort((a, b) => Number(b.price) - Number(a.price));
        }

        matchedTours = sortedByPrice
          .slice(0, CONFIG.MAX_TOURS_RESULT)
          .map(t => ({
            ...t,
            itineraries: itineraryMap[t.tour_id] || [],
            matchScore: 50,
            matchReasons: [`💰 Giá ${priceRange.type === 'cheap' ? 'tốt' : 'cao cấp'}`]
          }));
        logger.info('fallback_price_applied', { count: matchedTours.length });
      }

      // ✅ Fallback 3: Top rated
      if (!matchedTours || matchedTours.length === 0) {
        logger.warn('fallback_to_top_rated', {});
        matchedTours = candidateTours
          .sort((a, b) => parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0))
          .slice(0, CONFIG.MAX_TOURS_RESULT)
          .map(t => ({
            ...t,
            itineraries: itineraryMap[t.tour_id] || [],
            matchScore: 40,
            matchReasons: [`⭐ Đánh giá cao (${parseFloat(t.avg_rating || 0).toFixed(1)}/5)`]
          }));
        logger.info('fallback_toprated_applied', { count: matchedTours.length });
      }
    }

    // Get conversation history
    const [history] = await pool.query(
      `SELECT role, message FROM ai_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [user_id]
    );

    const historyText = history
      .reverse()
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.message}`)
      .join("\n");

    // Generate AI response
    const prompt = matchedTours.length > 0
      ? `Bạn là trợ lý du lịch chuyên nghiệp.

Lịch sử trò chuyện:
${historyText}

Yêu cầu của khách: "${message}"

Tours phù hợp nhất:
${matchedTours
  .map(
    (t, i) => `${i + 1}. **${t.name}**
   💰 Giá: ${t.price?.toLocaleString() || 'N/A'} ${t.currency || "VND"}
   📅 Thời gian: ${t.start_date} → ${t.end_date}
   ⭐ Đánh giá: ${parseFloat(t.avg_rating || 0).toFixed(1)}/5 (${parseInt(t.total_bookings || 0)} khách)
   🎯 Phù hợp: ${t.matchReasons.join(", ")}`
  )
  .join("\n")}

Hướng dẫn:
- Xác nhận hiểu ý định của khách
- Gợi ý tour TỐT NHẤT với giải thích rõ
- Làm nổi bật điểm ĐẶC BIỆT
- Kết thúc: "Bạn muốn biết thêm chi tiết về tour nào?"
- Độ dài: 4-6 câu`
      : `Bạn là trợ lý du lịch chuyên nghiệp.

Lịch sử:
${historyText}

Yêu cầu: "${message}"

⚠️ Hiện tại không có tour phù hợp.

Hướng dẫn:
- Thông báo lịch sự
- KHÔNG sáng tạo tour
- Đề xuất: "Thử với tiêu chí khác"
- Độ dài: 3-4 câu`;

    let aiReply;
    try {
      aiReply = await callOpenAI(prompt, "gpt-4o");
    } catch (err) {
      logger.warn('gpt4o_fallback', {});
      aiReply = await callOpenAI(prompt, "gpt-4o-mini");
    }
    // ============ FORCE AI SUGGESTED TOUR TO TOP ============
const suggestedTourName = extractSuggestedTourFromAI(aiReply);

if (suggestedTourName) {
  const beforeTop = matchedTours[0]?.name;

  matchedTours = prioritizeSuggestedTour(
    matchedTours,
    suggestedTourName
  );

  logger.info('ai_suggested_tour_forced', {
    suggestedTourName,
    beforeTop,
    afterTop: matchedTours[0]?.name
  });
}


    // Save AI response
    await pool.query(
      `INSERT INTO ai_messages (message_id, user_id, role, message, tours)
       VALUES (?, ?, 'assistant', ?, ?)`,
      [uuidv4(), user_id, aiReply, JSON.stringify(matchedTours)]
    );

    logger.info('chat_complete', { 
      toursCount: matchedTours.length,
      isFollowUp
    });

    res.json({
      success: true,
      reply: aiReply,
      tours: matchedTours,
      detectedLocation: mentionedLocation,
      searchDate,
      isFollowUp,
      userIntent: userIntent ? {
        weather: userIntent.desired_weather,
        environment: userIntent.desired_environment,
        vibe: userIntent.desired_vibe,
        energy: userIntent.desired_energy,
        motivations: userIntent.desired_motivations,
        keywords: userIntent.keywords,
        confidence: userIntent.confidence,
        summary: userIntent.summary,
        source: userIntent.source
      } : null
    });
  } catch (err) {
    logger.error('chat_error', err);
    const statusCode = err.message.includes('Invalid') || err.message.includes('Too many') ? 400 : 500;
    const message = err.message.includes('timeout') 
      ? 'Response timeout. Please try again.'
      : err.message.includes('Too many')
      ? 'Too many requests. Please wait.'
      : 'Failed to process request.';

    res.status(statusCode).json({ 
      success: false, 
      message,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ============ HISTORY ROUTE ============
router.get("/history/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ success: false, message: "Invalid user_id" });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(5, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const [rows] = await pool.query(
      `SELECT role, message, tours, created_at FROM ai_messages
       WHERE user_id = ? 
       ORDER BY created_at ASC 
       LIMIT ? OFFSET ?`,
      [user_id, limitNum, offset]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM ai_messages WHERE user_id = ?`,
      [user_id]
    );

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum);

    logger.info('history_fetched', { 
      userId: user_id, 
      count: rows.length, 
      page: pageNum 
    });

    res.json({
      success: true,
      messages: rows.map(r => ({
        role: r.role,
        message: r.message,
        tours: r.tours ? JSON.parse(r.tours) : [],
        createdAt: r.created_at
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (err) {
    logger.error('history_fetch_failed', err);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
});

// ============ HEALTH CHECK ============
router.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    cache: {
      size: apiCallCache.cache.size,
      maxSize: CONFIG.MAX_CACHE_SIZE
    }
  });
});

// ============ CACHE CLEAR ============
router.post("/cache/clear", (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  apiCallCache.clear();
  logger.info('cache_cleared', {});
  
  res.json({ success: true, message: "Cache cleared" });
});

module.exports = router;
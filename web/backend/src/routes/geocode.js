const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();

const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY;

// 🧭 Forward Geocode (tên địa điểm → danh sách gợi ý địa chỉ chi tiết)
router.get("/", async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Thiếu tham số address" });

  console.log("🔍 [Forward Geocode] Query:", address);

  try {
    const { data } = await axios.get(
      "https://api.geoapify.com/v1/geocode/autocomplete",
      {
        params: {
          text: address,
          apiKey: GEOAPIFY_KEY,
          limit: 5,
          lang: "vi",
          filter: "countrycode:vn",
        },
      }
    );

    if (!data.features || data.features.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy địa chỉ phù hợp" });
    }

    // 🧩 Trả về danh sách gợi ý chi tiết
    const results = data.features.map((f) => ({
      place_id: f.properties.place_id,
      formatted: f.properties.formatted,
      housenumber: f.properties.housenumber || null,
      street: f.properties.street || null,
      district: f.properties.suburb || f.properties.district || null,
      city: f.properties.city || f.properties.county || null,
      country: f.properties.country || null,
      lat: f.properties.lat,
      lon: f.properties.lon,
    }));

    console.log("✅ Geocode results:", results);
    res.json({ results });
  } catch (err) {
    console.error("❌ Geocoding failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Lỗi khi lấy gợi ý địa chỉ" });
  }
});

// 🧭 Reverse Geocode (tọa độ → địa chỉ)
router.get("/reverse", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Thiếu tham số lat/lon" });

  console.log("🔄 [Reverse Geocode] lat:", lat, "lon:", lon);

  try {
    const { data } = await axios.get(
      "https://api.geoapify.com/v1/geocode/reverse",
      {
        params: { lat, lon, apiKey: GEOAPIFY_KEY, lang: "vi" },
      }
    );

    const f = data.features[0]?.properties;
    if (!f) return res.status(404).json({ error: "Không tìm thấy địa chỉ" });

    const result = {
      formatted: f.formatted,
      housenumber: f.housenumber || null,
      street: f.street || null,
      district: f.suburb || f.district || null,
      city: f.city || f.county || null,
      country: f.country || null,
      lat: f.lat,
      lon: f.lon,
    };

    console.log("✅ Reverse result:", result);
    res.json(result);
  } catch (err) {
    console.error("❌ Reverse geocoding failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Lỗi khi truy vấn ngược vị trí" });
  }
});

module.exports = router;

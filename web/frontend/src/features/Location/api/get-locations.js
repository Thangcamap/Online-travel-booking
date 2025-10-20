import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function searchLocations(query) {
  if (!query) return [];

  const res = await axios.get(`${API_BASE}/api/geocode`, {
    params: { address: query },
  });

  // ✅ Backend giờ trả về mảng `results`
  const results = res.data.results;
  if (!results || results.length === 0) return [];

  // 🔄 Format lại dữ liệu để hiển thị rõ ràng hơn
  return results.map((item) => ({
    place_id: item.place_id,
    formatted:
      item.formatted ||
      `${item.housenumber || ""} ${item.street || ""}, ${item.city || ""}, ${
        item.country || ""
      }`.trim(),
    lat: item.lat,
    lon: item.lon,
  }));
}

export async function reverseGeocode(lat, lon) {
  const res = await axios.get(`${API_BASE}/api/geocode/reverse`, {
    params: { lat, lon },
  });

  return res.data || {};
}

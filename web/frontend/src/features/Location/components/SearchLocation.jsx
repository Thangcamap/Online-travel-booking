import React, { useState, useEffect } from "react";
import { searchLocations } from "../api/get-locations";

export default function SearchLocation({ value, onChange }) {
  const [query, setQuery] = useState(value?.formatted || "");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(false); // ✅ Theo dõi trạng thái chọn

  useEffect(() => {
    if (selected) return; // ✅ Nếu vừa chọn xong → không gọi API nữa

    const timeout = setTimeout(async () => {
      if (query.length > 2) {
        const results = await searchLocations(query);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [query, selected]);

  const handleSelect = (place) => {
    onChange({
      formatted: place.formatted,
      lat: place.lat,
      lon: place.lon,
    });
    setQuery(place.formatted);
    setSuggestions([]);
    setSelected(true); // ✅ Đánh dấu là đã chọn địa chỉ
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    onChange(null);
    setSelected(false); // ✅ Cho phép gợi ý lại khi người dùng gõ mới
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Nhập địa chỉ cụ thể"
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 bg-white border mt-1 rounded-md shadow-lg w-full max-h-48 overflow-y-auto">
          {suggestions.map((place) => (
            <li
              key={place.place_id}
              onClick={() => handleSelect(place)}
              className="px-3 py-2 hover:bg-orange-100 cursor-pointer"
            >
              {place.formatted}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

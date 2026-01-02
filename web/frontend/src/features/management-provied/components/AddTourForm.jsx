import React, { useState, useEffect } from "react";
import { Upload, X, ArrowRight, ArrowLeft } from "lucide-react";
import axios from "@/lib/axios";

export default function AddTourForm({ providerId, onAdded }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    available_slots: "",
    start_date: "",
    end_date: "",
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(0);
  const [itinerary, setItinerary] = useState([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) {
        setDays(diff);
        setItinerary(
          Array.from({ length: diff }, (_, i) => ({
            day_number: i + 1,
            title: `Ngày ${i + 1}`,
            description: "",
          }))
        );
      } else {
        setDays(0);
        setItinerary([]);
      }
    }
  }, [form.start_date, form.end_date]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateBasic = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Tên tour không được để trống";
    if (!form.price || form.price <= 0) newErrors.price = "Giá phải lớn hơn 0";
    if (!form.available_slots || form.available_slots <= 0) newErrors.available_slots = "Số chỗ phải lớn hơn 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDates = () => {
    const newErrors = {};
    if (!form.start_date) newErrors.start_date = "Ngày bắt đầu không được để trống";
    if (!form.end_date) newErrors.end_date = "Ngày kết thúc không được để trống";
    if (days <= 0) newErrors.dates = "Vui lòng chọn ngày hợp lệ (ngày kết thúc phải sau ngày bắt đầu)";
    
    const emptyDays = itinerary.filter(item => !item.title.trim() || !item.description.trim());
    if (emptyDays.length > 0) {
      newErrors.itinerary = `Vui lòng điền đầy đủ tiêu đề và mô tả cho tất cả ${days} ngày`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const allFiles = [...files, ...newFiles.filter(f => !files.some(old => old.name === f.name && old.size === f.size))];
    setFiles(allFiles);
    setPreviews(allFiles.map(file => URL.createObjectURL(file)));
  };

  const handleRemoveImage = (idx) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    setPreviews(newFiles.map(file => URL.createObjectURL(file)));
  };

  const handleItineraryChange = (index, field, value) => {
    const updated = [...itinerary];
    updated[index][field] = value;
    setItinerary(updated);
  };

  const handleNextTab = () => {
    if (activeTab === "basic") {
      if (validateBasic()) {
        setActiveTab("dates");
      }
    } else if (activeTab === "dates") {
      if (validateDates()) {
        setActiveTab("images");
      }
    }
  };

  const handlePrevTab = () => {
    if (activeTab === "dates") {
      setActiveTab("basic");
    } else if (activeTab === "images") {
      setActiveTab("dates");
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một ảnh!");
      return;
    }

    setLoading(true);
    try {
      const createRes = await axios.post("/tours", {
        name: form.name,
        description: form.description,
        price: parseInt(form.price),
        currency: "VND",
        start_date: form.start_date,
        end_date: form.end_date,
        available_slots: parseInt(form.available_slots),
        available: true,
        provider_id: providerId
      });

      if (!createRes.data.success || !createRes.data.tour) {
        throw new Error("Lỗi tạo tour");
      }

      const newTourId = createRes.data.tour.tour_id;

      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        await axios.post(`/tours/${newTourId}/upload-image`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      if (itinerary.length > 0) {
        await axios.post(`/tours/${newTourId}/itinerary`, { itinerary });
      }

      alert(" Tạo tour thành công!");
      onAdded?.();

      setForm({
        name: "",
        description: "",
        price: "",
        available_slots: "",
        start_date: "",
        end_date: "",
      });
      setFiles([]);
      setPreviews([]);
      setItinerary([]);
      setDays(0);
      setActiveTab("basic");
      setErrors({});
    } catch (err) {
      console.error("Lỗi tạo tour:", err);
      alert(`❌ ${err.response?.data?.message || err.message || "Có lỗi xảy ra khi tạo tour"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Thêm Tour Mới</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-300">
          {[
            { id: "basic", label: "Thông Tin Cơ Bản" },
            { id: "dates", label: "Ngày & Lịch Trình" },
            { id: "images", label: "Hình Ảnh" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Tour *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="VD: Du lịch Hạ Long Bay 3 ngày"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô Tả Tour</label>
                <textarea
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Mô tả chi tiết về tour..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VND) *</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="2500000"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số Chỗ *</label>
                  <input
                    type="number"
                    name="available_slots"
                    value={form.available_slots}
                    onChange={handleChange}
                    placeholder="20"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.available_slots ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.available_slots && <p className="text-red-500 text-sm mt-1">{errors.available_slots}</p>}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleNextTab}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2"
                >
                  Tiếp Theo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Dates & Itinerary Tab */}
          {activeTab === "dates" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Bắt Đầu *</label>
  <input
    type="date"
    name="start_date"
    value={form.start_date}
    onChange={handleChange}
    min={new Date().toISOString().split('T')[0]}
    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`}
  />
  {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Kết Thúc *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.end_date && <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>}
                </div>
              </div>

              {errors.dates && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">{errors.dates}</p>}
              {errors.itinerary && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">{errors.itinerary}</p>}

              {days > 0 && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm font-medium text-gray-900">📅 Tổng thời gian: <span className="text-blue-600">{days} ngày</span></p>
                </div>
              )}

              {days > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Lịch Trình Chi Tiết</h3>
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {itinerary.map((item, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded border border-gray-300">
                        <p className="text-sm font-medium text-gray-700 mb-2">Ngày {item.day_number}</p>
                        <input
                          className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="Tiêu đề"
                          value={item.title}
                          onChange={(e) => handleItineraryChange(index, "title", e.target.value)}
                        />
                        <textarea
                          rows={2}
                          placeholder="Mô tả hoạt động..."
                          value={item.description}
                          onChange={(e) => handleItineraryChange(index, "description", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={handlePrevTab}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay Lại
                </button>
                <button
                  onClick={handleNextTab}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2"
                >
                  Tiếp Theo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === "images" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hình Ảnh Tour</label>
                <label className="block">
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center cursor-pointer hover:bg-orange-50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-sm font-medium text-gray-900">Chọn hoặc kéo ảnh vào đây</p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </label>
              </div>

              {previews.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{previews.length} ảnh đã chọn</p>
                  <div className="grid grid-cols-3 gap-3">
                    {previews.map((src, idx) => (
                      <div key={idx} className="relative group rounded border border-gray-300 overflow-hidden">
                        <img src={src} alt={`preview-${idx}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={handlePrevTab}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay Lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : " Tạo Tour"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}